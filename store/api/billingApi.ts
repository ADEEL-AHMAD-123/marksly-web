import { baseApi } from './baseApi';

export type Gateway = 'safepay' | 'jazzcash' | 'easypaisa';

export interface BillingPayment {
  id?: string;
  amount: number;
  currency: string;
  gateway: string;
  reference: string | null;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paidAt: string | null;
  createdAt: string;
  // A chargeback was reported for this payment — separate from `status`,
  // since a dispute doesn't automatically mean the money was reversed.
  disputed?: boolean;
}

export interface MyBilling {
  plan: string;
  // What the currently-active plan actually costs — always reflects `plan`,
  // never a pending unpaid selection. Use this (not `amountDue`) for any
  // "your plan costs X" display.
  planPrice: number;
  // Why the institution is on this plan right now — 'admin_override' means
  // a superadmin granted it directly with no payment collected. Null only
  // for very old institutions predating this tracking (no audit entry).
  planSource: 'payment' | 'self_serve_free' | 'scheduled_downgrade' | 'admin_override' | 'unknown' | null;
  // Lets the plan picker warn BEFORE a downgrade is submitted if it would
  // put the institution over the target plan's studentsLimit — compare
  // against each BillingPlan's studentsLimit client-side.
  activeStudentCount: number;
  // Set only when a different plan has been selected but not yet paid for —
  // `plan` always reflects what's actually active/entitled right now.
  pendingPlan: string | null;
  // Set only when a downgrade (or lateral move) is scheduled to take effect
  // for free at the next renewal — mutually exclusive with `pendingPlan`.
  scheduledPlan: string | null;
  status: string;
  currency: string;
  billingCycle: string;
  nextBillingAt: string | null;
  lastPaymentAt: string | null;
  trialEndsAt: string | null;
  // What's actually owed right now — equals planPrice normally, but is the
  // *pending* plan's price if a change is awaiting payment.
  amountDue: number;
  // Most recent page only — see `paymentsTotal` and `useGetMyPaymentsQuery`
  // for "load more" pagination over the full history.
  payments: BillingPayment[];
  paymentsTotal: number;
  online: { safepay: boolean; jazzcash: boolean; easypaisa: boolean; live: boolean };
  bank: { name: string | null; accountTitle: string | null; iban: string | null };
  // Auto-renewal (tokenized card, automatic charge on renewal) — a separate
  // opt-in on top of everything above, never assumed/defaulted on.
  autoRenewalAvailable: boolean;
  autoRenew: boolean;
  savedCard: { brand: string | null; last4: string | null; expiry: string | null } | null;
  autoChargeFailCount: number;
  lastChargeAttempt: {
    attemptedAt: string;
    success: boolean;
    reasonCode: 'insufficient_funds' | 'expired_card' | 'card_blocked' | 'auth_failed' | 'gateway_error' | 'other' | null;
  } | null;
}

export interface BillingPlan {
  key: string;
  name: string;
  price: number;
  studentsLimit: number;
  storageGB: number;
  features: string[];
}

export interface PendingPayment {
  institutionId: string;
  institutionName: string;
  planType: string;
  paymentId: string;
  amount: number;
  gateway: string;
  reference: string | null;
  createdAt: string;
}

export interface DisputedPayment {
  institutionId: string;
  institutionName: string;
  paymentId: string;
  amount: number;
  gateway: string;
  reference: string | null;
  status: string;
  disputeNote: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export type NeedsReviewSource = 'checkout_autosettle' | 'verify_poll' | 'webhook' | 'bank_transfer_confirm' | 'auto_renewal';

export interface NeedsReviewPayment {
  institutionId: string;
  institutionName: string;
  paymentId: string;
  amount: number;
  gateway: string;
  gatewayTxnId: string | null;
  reference: string | null;
  status: string;
  reviewNote: string | null;
  reviewSource: NeedsReviewSource | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

interface ApiObject<T> { success: boolean; data: T; message: string }

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyBilling: builder.query<ApiObject<MyBilling>, void>({
      query: () => '/billing/me',
      providesTags: [{ type: 'Billing', id: 'ME' }],
    }),
    getBillingPlans: builder.query<ApiObject<BillingPlan[]>, void>({
      query: () => '/billing/plans',
    }),
    getMyPayments: builder.query<ApiObject<{ items: BillingPayment[]; total: number; page: number; limit: number }>, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `/billing/payments?page=${page}&limit=${limit}`,
    }),
    selectPlan: builder.mutation<
      ApiObject<{
        plan: string;
        monthlyAmount: number;
        effective: 'now' | 'next_renewal' | 'pending_payment';
        effectiveAt?: string | null;
        // Set (non-blocking) when the target plan's student limit is lower
        // than the number of active students already enrolled.
        overStudentLimit?: number | null;
      }>,
      { planKey: string }
    >({
      query: (body) => ({ url: '/billing/plan', method: 'POST', body }),
      invalidatesTags: [{ type: 'Billing', id: 'ME' }],
    }),
    requestCustomPlan: builder.mutation<ApiObject<{ id: string }>, { message: string; desiredStudents?: number }>({
      query: (body) => ({ url: '/billing/request-custom-plan', method: 'POST', body }),
    }),
    billingCheckout: builder.mutation<ApiObject<{ settled: boolean; gateway: string; reference: string; redirectUrl?: string | null; gatewayTxnId?: string | null }>, { gateway: Gateway }>({
      query: (body) => ({ url: '/billing/checkout', method: 'POST', body }),
      invalidatesTags: [{ type: 'Billing', id: 'ME' }],
    }),
    // Reconciliation fallback for when the payer returns from a hosted
    // checkout page before (or without) a webhook ever arriving.
    verifyPayment: builder.mutation<ApiObject<{ status: 'success' | 'pending' | 'failed' | 'refunded' }>, { gateway: Gateway; gatewayTxnId: string }>({
      query: ({ gateway, gatewayTxnId }) => ({ url: `/billing/verify?gateway=${gateway}&gatewayTxnId=${encodeURIComponent(gatewayTxnId)}` }),
      invalidatesTags: [{ type: 'Billing', id: 'ME' }],
    }),
    submitBankTransfer: builder.mutation<ApiObject<{ ok: boolean }>, { reference: string; amount?: number }>({
      query: (body) => ({ url: '/billing/bank-transfer', method: 'POST', body }),
      invalidatesTags: [{ type: 'Billing', id: 'ME' }],
    }),

    // Auto-renewal — save a card (zero-amount verification), confirm it
    // after the redirect back, or turn it off.
    startAutoRenew: builder.mutation<ApiObject<{ redirectUrl: string; gatewayTxnId: string | null }>, void>({
      query: () => ({ url: '/billing/auto-renew/start', method: 'POST' }),
    }),
    confirmAutoRenew: builder.mutation<
      ApiObject<{ ok: boolean; reason?: string; savedCard?: { brand: string | null; last4: string | null; expiry: string | null } }>,
      { gatewayTxnId: string }
    >({
      query: ({ gatewayTxnId }) => ({ url: `/billing/auto-renew/confirm?gatewayTxnId=${encodeURIComponent(gatewayTxnId)}` }),
      invalidatesTags: [{ type: 'Billing', id: 'ME' }],
    }),
    disableAutoRenew: builder.mutation<ApiObject<{ ok: boolean }>, void>({
      query: () => ({ url: '/billing/auto-renew/disable', method: 'POST' }),
      invalidatesTags: [{ type: 'Billing', id: 'ME' }],
    }),

    // Super admin
    getPendingPayments: builder.query<ApiObject<PendingPayment[]>, void>({
      query: () => '/billing/pending',
      providesTags: [{ type: 'Billing', id: 'PENDING' }],
    }),
    getDisputedPayments: builder.query<ApiObject<DisputedPayment[]>, void>({
      query: () => '/billing/disputed',
      providesTags: [{ type: 'Billing', id: 'DISPUTED' }],
    }),
    resolveDispute: builder.mutation<ApiObject<{ ok: boolean }>, { institutionId: string; paymentId: string }>({
      query: ({ institutionId, paymentId }) => ({ url: `/billing/${institutionId}/payments/${paymentId}/resolve-dispute`, method: 'POST' }),
      invalidatesTags: [{ type: 'Billing', id: 'DISPUTED' }],
    }),
    // A gateway charge that genuinely happened but couldn't be credited
    // because settle()'s own race guard caught a different payment already
    // winning the same billing cycle — needs a human to look at, likely
    // refund. See markPaymentNeedsReview() in billing.service.ts.
    getNeedsReviewPayments: builder.query<ApiObject<NeedsReviewPayment[]>, void>({
      query: () => '/billing/needs-review',
      providesTags: [{ type: 'Billing', id: 'NEEDS_REVIEW' }],
    }),
    resolveNeedsReview: builder.mutation<ApiObject<{ ok: boolean }>, { institutionId: string; paymentId: string }>({
      query: ({ institutionId, paymentId }) => ({ url: `/billing/${institutionId}/payments/${paymentId}/resolve-review`, method: 'POST' }),
      invalidatesTags: [{ type: 'Billing', id: 'NEEDS_REVIEW' }],
    }),

    // ─── Testing tools (superadmin) ─────────────────────────────────────
    // Manually run the daily auto-renewal charge sweep instead of waiting
    // for the 02:30 PKT cron — safe to call any time, it only ever picks up
    // subscriptions whose renewal/retry is actually due (see the backend
    // controller's own comment).
    runAutoRenewSweep: builder.mutation<ApiObject<{ checked: number; charged: number; failed: number; fellBack: number }>, void>({
      query: () => ({ url: '/billing/auto-renew/run-sweep', method: 'POST' }),
      // Running the sweep can change institution status (past_due fallback)
      // and payment/subscription state — refresh whatever a superadmin
      // might be looking at right after triggering it.
      invalidatesTags: [
        { type: 'Billing', id: 'PENDING' },
        { type: 'Billing', id: 'NEEDS_REVIEW' },
        { type: 'Institutions', id: 'LIST' },
        { type: 'Institutions', id: 'OVERVIEW' },
        { type: 'Institutions', id: 'REVENUE' },
      ],
    }),
    confirmPayment: builder.mutation<
      ApiObject<{
        ok: boolean;
        status: 'confirmed' | 'already_confirmed' | 'blocked_by_concurrent_payment';
        nextBillingAt: string | null;
      }>,
      { institutionId: string; paymentId: string }
    >({
      query: ({ institutionId, paymentId }) => ({ url: `/billing/${institutionId}/payments/${paymentId}/confirm`, method: 'POST' }),
      // Also refresh the superadmin's own institution-detail and revenue
      // views for this institution — confirming a payment changes both, and
      // (if it settles) can also grant entitlements for a plan the
      // institution had pending, which writes a new Plan History row.
      invalidatesTags: (_r, _e, { institutionId }) => [
        { type: 'Billing', id: 'PENDING' },
        { type: 'Billing', id: 'NEEDS_REVIEW' },
        { type: 'Institutions', id: institutionId },
        { type: 'Institutions', id: 'OVERVIEW' },
        { type: 'Institutions', id: 'REVENUE' },
        { type: 'Institutions', id: `${institutionId}-PLAN-HISTORY` },
      ],
    }),
    rejectPayment: builder.mutation<ApiObject<unknown>, { institutionId: string; paymentId: string; reason?: string }>({
      query: ({ institutionId, paymentId, reason }) => ({ url: `/billing/${institutionId}/payments/${paymentId}/reject`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { institutionId }) => [
        { type: 'Billing', id: 'PENDING' },
        { type: 'Institutions', id: institutionId },
      ],
    }),
  }),
});

export const {
  useGetMyBillingQuery,
  useGetBillingPlansQuery,
  useLazyGetMyPaymentsQuery,
  useSelectPlanMutation,
  useRequestCustomPlanMutation,
  useBillingCheckoutMutation,
  useVerifyPaymentMutation,
  useSubmitBankTransferMutation,
  useStartAutoRenewMutation,
  useConfirmAutoRenewMutation,
  useDisableAutoRenewMutation,
  useGetPendingPaymentsQuery,
  useGetDisputedPaymentsQuery,
  useResolveDisputeMutation,
  useGetNeedsReviewPaymentsQuery,
  useResolveNeedsReviewMutation,
  useRunAutoRenewSweepMutation,
  useConfirmPaymentMutation,
  useRejectPaymentMutation,
} = billingApi;
