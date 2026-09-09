import { baseApi } from './baseApi';
import type { IdCardSettings } from './institutionApi';

// Shared shape for the `institution` object embedded in every staff
// ID-card response (getStaffIdCards, getMyCard) — see user.service.ts's
// staffIdCards()/getMyCard().
export interface StaffIdCardInstitution {
  name: string;
  logoUrl: string | null;
  type?: string;
  settings?: { idCard?: IdCardSettings | null };
}

export type ManageableRole = 'teacher' | 'staff' | 'accountant';

export type EmailDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'delayed' | null;

export interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string | null;
  role: ManageableRole;
  isActive: boolean;
  // Not currently returned by GET /users (list/create/update) — only
  // populated after a successful upload via useUploadUserPhotoMutation's
  // own response. Kept optional/nullable here so callers that do have it
  // (or gain it later) can display it without a type change.
  profilePhoto?: string | null;
  address?: string | null;
  // Format NNNNN-NNNNNNN-N — same underlying field as Student's, always
  // labeled "CNIC" for staff regardless of institution type (staff are
  // adults). See marksly-api's national-id.schema.ts.
  nationalIdNumber?: string | null;
  cardIssueDate?: string | null;
  cardExpiryDate?: string | null;
  // false means an activation-link invite is still pending (see the
  // invite-based creation flow in user.service.ts) — the account can't log
  // in yet at all, regardless of `isActive`.
  emailVerified: boolean;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailDeliveryError: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  unassignedSubjects?: number;
  unassignedSections?: number;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateUserBody {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password?: string;
  role: ManageableRole;
  // Set on a resubmit after the backend flags EMAIL_DOMAIN_UNVERIFIED and
  // the admin confirms the address is correct anyway.
  confirmUnverifiedEmail?: boolean;
  nationalIdNumber?: string;
}

export type StaffCardRole = 'teacher' | 'staff' | 'accountant' | 'admin';

export interface StaffIdCard {
  id: string;
  name: string;
  role: StaffCardRole;
  systemId: string;
  profilePhoto: string | null;
  phone: string | null;
  address: string | null;
  subjectCount: number | null;
  qr: string;
  nationalIdNumber?: string | null;
  cardIssueDate?: string | null;
  cardExpiryDate?: string | null;
}

export interface MyContactInfo {
  phone: string;
  address: string | null;
  missing: string[];
}

export interface MyStaffCard extends StaffIdCard {
  institution: StaffIdCardInstitution;
  missing: string[];
  photoMissing: boolean;
}

export interface StaffIdCardSheet {
  institution: StaffIdCardInstitution;
  staff: StaffIdCard[];
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffIdCards: builder.query<ApiObject<StaffIdCardSheet>, { role?: StaffCardRole } | void>({
      query: (params) => {
        const role = params?.role;
        return `/users/id-cards${role ? `?role=${role}` : ''}`;
      },
      providesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    getUsers: builder.query<
      ApiArray<ManagedUser>,
      { role?: ManageableRole; search?: string; page?: number; limit?: number; incomplete?: boolean } | void
    >({
      query: (params) => {
        const s = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) s.set(k, String(v));
        });
        const qs = s.toString();
        return `/users${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    // tempPassword is only present for the explicit-password override path
    // (dto.password sent in the request) — normal creation goes through the
    // invite-link flow instead and never returns a password at all. Never
    // returned from getUsers/update, never persisted anywhere else.
    createUser: builder.mutation<ApiObject<ManagedUser & { tempPassword?: string }>, CreateUserBody>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    resendInvite: builder.mutation<ApiObject<ManagedUser>, { id: string; email?: string; confirmUnverifiedEmail?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}/resend-invite`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    updateUser: builder.mutation<
      ApiObject<ManagedUser>,
      {
        id: string;
        body: Partial<Omit<CreateUserBody, 'nationalIdNumber'>> & {
          isActive?: boolean;
          address?: string;
          // `| null` — an admin can explicitly clear a previously-set value
          // from the quick card editor (EditCardDetailsDialog.tsx); omitting
          // the key entirely (not present in body) still means "untouched".
          nationalIdNumber?: string | null;
          // Card-specific fields, admin-only — see user.validator.ts. Never
          // accepted on the self-service updateMyContact endpoint, which
          // silently strips them if sent.
          cardIssueDate?: string | null;
          cardExpiryDate?: string | null;
        };
      }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    // Admin-only bulk re-issue — resets cardIssueDate/cardExpiryDate for
    // every active staff member of one role, or every manageable role at
    // once when role is 'all' (byRole is only present for the 'all' case).
    // See user.service.ts's reissueCards().
    reissueStaffCards: builder.mutation<
      ApiObject<{ updatedCount: number; byRole?: Record<string, number> }>,
      { role: StaffCardRole | 'all' }
    >({
      query: (body) => ({ url: '/users/reissue-cards', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    // Self-service — "My ID Card" page. Scoped to the caller's own account
    // via the JWT, not an :id param — any logged-in staff-type user can use
    // these on themself, unlike updateUser above (admin-only, any user).
    getMyContact: builder.query<ApiObject<MyContactInfo>, void>({
      query: () => '/users/me/contact',
      providesTags: ['MyContact'],
    }),
    updateMyContact: builder.mutation<ApiObject<MyContactInfo>, { phone?: string; address?: string }>({
      query: (body) => ({ url: '/users/me/contact', method: 'PATCH', body }),
      invalidatesTags: ['MyContact'],
    }),
    getMyCard: builder.query<ApiObject<MyStaffCard>, void>({
      query: () => '/users/me/card',
      providesTags: ['MyContact'],
    }),
    // Self-service — uploading/removing one's OWN profile photo, used by
    // the "My ID Card" page for every role, not just admin acting on
    // someone else's behalf (that's uploadUserPhoto/removeUserPhoto above).
    uploadMyPhoto: builder.mutation<ApiObject<{ profilePhoto: string }>, { file: File }>({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append('photo', file);
        return { url: '/users/me/photo', method: 'POST', body: formData };
      },
      invalidatesTags: ['MyContact'],
    }),
    removeMyPhoto: builder.mutation<ApiObject<{ profilePhoto: null }>, void>({
      query: () => ({ url: '/users/me/photo', method: 'DELETE' }),
      invalidatesTags: ['MyContact'],
    }),
    deleteUser: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    // FormData body — mirrors institutionApi.ts's uploadInstitutionLogo
    // exactly (fetchBaseQuery passes FormData straight through, browser
    // sets the multipart boundary itself).
    uploadUserPhoto: builder.mutation<ApiObject<{ profilePhoto: string }>, { userId: string; file: File }>({
      query: ({ userId, file }) => {
        const formData = new FormData();
        formData.append('photo', file);
        return { url: `/users/${userId}/photo`, method: 'POST', body: formData };
      },
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, { type: 'Students', id: 'LIST' }, 'Students'],
    }),
    removeUserPhoto: builder.mutation<ApiObject<{ profilePhoto: null }>, { userId: string }>({
      query: ({ userId }) => ({ url: `/users/${userId}/photo`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, { type: 'Students', id: 'LIST' }, 'Students'],
    }),
    bulkImportUsers: builder.mutation<
      ApiObject<{
        created: number;
        total: number;
        failed: number;
        results: {
          row: number;
          status: 'created' | 'error';
          name?: string;
          message?: string;
          email?: string;
          emailDeliveryStatus?: EmailDeliveryStatus;
          emailDeliveryError?: string;
        }[];
      }>,
      { csv: string; role: ManageableRole }
    >({
      query: (body) => ({ url: '/users/bulk', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBulkImportUsersMutation,
  useResendInviteMutation,
  useUploadUserPhotoMutation,
  useRemoveUserPhotoMutation,
  useGetStaffIdCardsQuery,
  useReissueStaffCardsMutation,
  useGetMyContactQuery,
  useUpdateMyContactMutation,
  useGetMyCardQuery,
  useUploadMyPhotoMutation,
  useRemoveMyPhotoMutation,
} = usersApi;
