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

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
    bulkImportUsers: builder.mutation<
      ApiObject<{ created: number; total: number; failed: number; results: { row: number; status: string; name?: string; message?: string }[] }>,
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
} = usersApi;
