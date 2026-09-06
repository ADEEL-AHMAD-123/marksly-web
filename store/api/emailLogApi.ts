import { baseApi } from './baseApi';

// Mirrors backend modules/email-log/email-log.model.ts's EmailCategory
// exactly — keep in sync.
export type EmailCategory =
  | 'verification'
  | 'password_reset'
  | 'email_change'
  | 'invite'
  | 'welcome_credentials'
  | 'billing'
  | 'contact_form'
  | 'platform_alert';

export type EmailStatus = 'sent' | 'failed' | 'delivered' | 'bounced';

export interface EmailLogEntry {
  id: string;
  category: EmailCategory;
  to: string;
  subject: string;
  status: EmailStatus;
  error: string | null;
  relatedUserId: string | null;
  createdAt: string;
}

export interface EmailLogStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  byCategory: Partial<Record<EmailCategory, number>>;
}

export interface ListEmailLogParams {
  page?: number;
  limit?: number;
  category?: EmailCategory | 'all';
  status?: EmailStatus | 'all';
  search?: string;
}

interface ApiList<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiObject<T> {
  success: boolean;
  data: T;
  message: string;
}

export const emailLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmailLog: builder.query<ApiList<EmailLogEntry>, ListEmailLogParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
        });
        const qs = search.toString();
        return `/email-log${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [...result.data.map((e) => ({ type: 'EmailLog' as const, id: e.id })), { type: 'EmailLog' as const, id: 'LIST' }]
          : [{ type: 'EmailLog' as const, id: 'LIST' }],
    }),
    getEmailLogStats: builder.query<ApiObject<EmailLogStats>, void>({
      query: () => '/email-log/stats',
      providesTags: [{ type: 'EmailLog', id: 'STATS' }],
    }),
    resendEmailLog: builder.mutation<ApiObject<{ resent: boolean; via: string; sentTo?: string }>, string>({
      query: (id) => ({ url: `/email-log/${id}/resend`, method: 'POST' }),
      invalidatesTags: [{ type: 'EmailLog', id: 'LIST' }, { type: 'EmailLog', id: 'STATS' }],
    }),
  }),
});

export const { useGetEmailLogQuery, useGetEmailLogStatsQuery, useResendEmailLogMutation } = emailLogApi;
