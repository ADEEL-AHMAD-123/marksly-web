import { baseApi } from './baseApi';

export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';
export type NoticeRole = 'teacher' | 'student' | 'parent' | 'accountant' | 'staff';
// What a notice is ABOUT, separate from priority (how urgent it is) — a
// notice can be a routine Event or an urgent Alert; the two are
// independent. 'holiday' is never posted by hand — it's stamped only by
// the backend's own holiday-broadcast call, so it's excluded from
// CreateNoticeBody/the Post Notice form's own type picker below.
export type NoticeType = 'announcement' | 'alert' | 'event' | 'academic' | 'holiday';

export interface Notice {
  id: string;
  title: string;
  body: string;
  priority: NoticePriority;
  type: NoticeType;
  targetRoles: NoticeRole[];
  publishedAt: string;
  expiresAt: string | null;
  author: string | null;
  // True only for the per-institution copy of a superadmin platform
  // broadcast (see marksly-api's platform-announcement.model.ts /
  // superadmin-announcements.service.ts) — drives the "Platform" badge
  // everywhere a notice renders, so people can tell it's from Marksly
  // itself rather than their own institution's admin.
  isPlatformAnnouncement: boolean;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateNoticeBody {
  title: string;
  body: string;
  type: Exclude<NoticeType, 'holiday'>;
  priority: NoticePriority;
  targetRoles: NoticeRole[];
  expiresAt?: string;
}

export const noticesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotices: builder.query<ApiArray<Notice>, { page?: number; limit?: number; priority?: NoticePriority[] } | void>({
      query: (params) => {
        const s = new URLSearchParams();
        if (params?.page) s.set('page', String(params.page));
        if (params?.limit) s.set('limit', String(params.limit));
        if (params?.priority?.length) s.set('priority', params.priority.join(','));
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
