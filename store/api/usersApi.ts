import { baseApi } from './baseApi';

export type ManageableRole = 'teacher' | 'staff' | 'accountant';

export type EmailDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | null;

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
}

export type StaffCardRole = 'teacher' | 'staff' | 'accountant' | 'admin';

export interface StaffIdCard {
  id: string;
  name: string;
  role: StaffCardRole;
  systemId: string;
  profilePhoto: string | null;
  subjectCount: number | null;
  qr: string;
}

export interface StaffIdCardSheet {
  institution: { name: string; logoUrl: string | null };
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
      { role?: ManageableRole; search?: string; page?: number; limit?: number } | void
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
      { id: string; body: Partial<CreateUserBody> & { isActive?: boolean } }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
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
} = usersApi;
