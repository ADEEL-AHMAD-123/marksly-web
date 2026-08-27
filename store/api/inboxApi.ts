import { baseApi } from './baseApi';

export type InboxItemType = 'notice' | 'fee_paid' | 'account' | 'exam_result' | 'plan_request';

export interface InboxItem {
  _id: string;
  institutionId: string;
  userId: string;
  type: InboxItemType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export const inboxApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInbox: builder.query<ApiArray<InboxItem>, { page?: number; limit?: number; unreadOnly?: boolean } | void>({
      query: (params) => {
        const s = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== null) s.set(k, String(v));
        });
        const qs = s.toString();
        return `/inbox${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Inbox', id: 'LIST' }],
    }),

    // Polled from the bell (see NotificationBell.tsx) rather than pushed —
    // the simplest thing that works without standing up real-time
    // infrastructure (Socket.io is an installed but never-wired-up
    // dependency in this repo; a ~30s poll is imperceptible for something
    // as low-urgency as "you have a new notification" and costs one small
    // request instead of a persistent connection per open tab).
    getInboxUnreadCount: builder.query<ApiObject<{ count: number }>, void>({
      query: () => '/inbox/unread-count',
      providesTags: [{ type: 'Inbox', id: 'UNREAD_COUNT' }],
    }),

    markInboxRead: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/inbox/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Inbox', id: 'LIST' }, { type: 'Inbox', id: 'UNREAD_COUNT' }],
    }),

    markAllInboxRead: builder.mutation<ApiObject<Record<string, never>>, void>({
      query: () => ({ url: '/inbox/read-all', method: 'PATCH' }),
      invalidatesTags: [{ type: 'Inbox', id: 'LIST' }, { type: 'Inbox', id: 'UNREAD_COUNT' }],
    }),
  }),
});

export const {
  useGetInboxQuery,
  useGetInboxUnreadCountQuery,
  useMarkInboxReadMutation,
  useMarkAllInboxReadMutation,
} = inboxApi;
