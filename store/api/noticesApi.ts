import { baseApi } from './baseApi';

export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';
export type NoticeRole = 'teacher' | 'student' | 'parent' | 'accountant' | 'staff';

export interface Notice {
  id: string;
  title: string;
  body: string;
  priority: NoticePriority;
  targetRoles: NoticeRole[];
  publishedAt: string;
  expiresAt: string | null;
  author: string | null;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateNoticeBody {
  title: string;
  body: string;
  priority: NoticePriority;
  targetRoles: NoticeRole[];
  expiresAt?: string;
}

export const noticesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotices: builder.query<ApiArray<Notice>, { page?: number; limit?: number } | void>({
      query: (params) => {
        const s = new URLSearchParams();
        if (params?.page) s.set('page', String(params.page));
        if (params?.limit) s.set('limit', String(params.limit));
        const qs = s.toString();
        return `/notices${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Notices', id: 'LIST' }],
    }),
    createNotice: builder.mutation<ApiObject<{ id: string }>, CreateNoticeBody>({
      query: (body) => ({ url: '/notices', method: 'POST', body }),
      invalidatesTags: [{ type: 'Notices', id: 'LIST' }],
    }),
    deleteNotice: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/notices/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Notices', id: 'LIST' }],
    }),
  }),
});

export const { useGetNoticesQuery, useCreateNoticeMutation, useDeleteNoticeMutation } = noticesApi;
