import { baseApi } from './baseApi';

// This page only ever shows the two "first login email" categories — the
// welcome/credentials email sent when an admin adds a student/parent, and
// the invite link sent when an admin adds a teacher/staff/accountant. See
// the backend's email-log.service.ts ONBOARDING_CATEGORIES for why every
// other category (verification, password reset, billing, etc.) is excluded.
export type EmailCategory = 'invite' | 'welcome_credentials';

export type EmailStatus = 'sent' | 'failed' | 'delivered' | 'bounced' | 'delayed';

export interface EmailLogEntry {
  id: string;
  category: EmailCategory;
  to: string;
  subject: string;
  status: EmailStatus;
  error: string | null;
  relatedUserId: string | null;
  /** True when this row is the result of clicking "Resend" (here or on the
   *  Students/Teachers/Staff pages), not the original send at account
   *  creation — so a second row for the same recipient reads as "the
   *  resend attempt" instead of an unexplained duplicate. */
  isResend: boolean;
  createdAt: string;
}

/**
 * One logical "email to this person for this purpose" thread. The list
 * endpoint groups raw sends by recipient+purpose and returns a single item
 * per thread — the headline fields (id/category/to/.../createdAt) describe
 * the LATEST attempt, so a thread that failed twice then succeeded reads as
 * "Sent" (the true current state), not as a stale failed row. `history`
 * holds the older attempts (newest-first, excluding the headline) for an
 * admin who wants to see what happened before.
 */
export interface EmailLogThread extends EmailLogEntry {
  /** Total number of send attempts in this thread (headline + history). */
  attemptCount: number;
  /** Older attempts in this thread, excluding the headline, newest-first. */
  history: EmailLogEntry[];
}

export interface EmailLogStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  delayed: number;
  byCategory: Partial<Record<EmailCategory, number>>;
  /** Accounts that never got an onboarding email at all because there was
   *  no email on file when they were added — see MissingEmailEntry below. */
  missingEmail: number;
}

export interface ListEmailLogParams {
  page?: number;
  limit?: number;
  category?: EmailCategory | 'all';
  status?: EmailStatus | 'all';
  search?: string;
}

export interface MissingEmailEntry {
  userId: string;
  name: string;
  role: 'student' | 'parent' | 'teacher' | 'staff' | 'accountant';
  phone: string | null;
  studentNames?: string[];
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
    getEmailLog: builder.query<ApiList<EmailLogThread>, ListEmailLogParams | void>({
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
    getEmailLogMissingEmail: builder.query<ApiObject<MissingEmailEntry[]>, void>({
      query: () => '/email-log/missing-email',
      providesTags: [{ type: 'EmailLog', id: 'MISSING' }],
    }),
    resendEmailLog: builder.mutation<
      ApiObject<{ resent: boolean; via: string; sentTo?: string }>,
      { id: string; email?: string; confirmUnverifiedEmail?: boolean }
    >({
      query: ({ id, email, confirmUnverifiedEmail }) => ({
        url: `/email-log/${id}/resend`,
        method: 'POST',
        body: email ? { email, confirmUnverifiedEmail } : undefined,
      }),
      invalidatesTags: [
        { type: 'EmailLog', id: 'LIST' },
        { type: 'EmailLog', id: 'STATS' },
        { type: 'EmailLog', id: 'MISSING' },
      ],
    }),
  }),
});

export const {
  useGetEmailLogQuery,
  useGetEmailLogStatsQuery,
  useGetEmailLogMissingEmailQuery,
  useResendEmailLogMutation,
} = emailLogApi;
