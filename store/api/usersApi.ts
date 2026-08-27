import { baseApi } from './baseApi';

export type ManageableRole = 'teacher' | 'staff' | 'accountant';

export interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string | null;
  role: ManageableRole;
  isActive: boolean;
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
    // tempPassword is only present when the account was auto-generated one
    // (no `password` sent in the request) and only in this response — never
    // returned from getUsers/update, never persisted anywhere else.
    createUser: builder.mutation<ApiObject<ManagedUser & { tempPassword?: string }>, CreateUserBody>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
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
} = usersApi;
