import { baseApi } from './baseApi';

export type OnlineGateway = 'safepay' | 'jazzcash' | 'easypaisa';
export type PayoutMethod = 'bank' | 'jazzcash' | 'easypaisa';
export type PayoutStatus = 'pending' | 'held_unverified_account' | 'paid' | 'failed';

interface ApiObject<T> { success: boolean; data: T; message: string }
interface ApiArray<T> { success: boolean; data: T[]; message: string }

export interface CheckoutResult {
  settled: boolean;
  reference: string;
  gateway: string;
  redirectUrl?: string | null;
  gatewayTxnId?: string | null;
  status?: string;
}

export interface PayoutAccount {
  method: PayoutMethod;
  accountTitle: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  walletNumber?: string;
  verified: boolean;
  verifiedAt?: string | null;
}

export interface InstitutionOwed {
  institutionId: string;
  institutionName: string;
  gross: number;
  paymentCount: number;
  oldestUnpaidAt: string;
  pendingClawback: number;
}

export interface Payout {
  id: string;
  institutionId: string;
  institutionName: string | null;
  periodStart: string;
  periodEnd: string;
  grossCollected: number;
  platformFee: number;
  clawbackAmount: number;
  netAmount: number;
  status: PayoutStatus;
  paidVia: string | null;
  paidReference: string | null;
  paidAt: string | null;
  paymentCount: number;
}

export interface GatewayStatus {
  safepay: boolean;
  jazzcash: boolean;
  easypaisa: boolean;
  live: boolean;
}

export const feesOnlineApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Parent/student
    getGatewayStatus: builder.query<ApiObject<GatewayStatus>, void>({
      query: () => '/fees-online/gateways',
    }),
    initiateOnlineCheckout: builder.mutation<ApiObject<CheckoutResult>, { invoiceId: string; gateway: OnlineGateway }>({
      query: ({ invoiceId, gateway }) => ({
        url: `/fees-online/invoices/${invoiceId}/checkout`,
        method: 'POST',
        body: { gateway },
      }),
      invalidatesTags: [{ type: 'Fees', id: 'INVOICES' }, { type: 'Fees', id: 'SUMMARY' }, 'Fees'],
    }),
    // A GET under the hood, but modeled as a mutation (not a query) so it
    // can carry invalidatesTags — calling this can settle a payment
    // server-side, which the invoice list needs to reflect immediately.
    verifyOnlinePayment: builder.mutation<ApiObject<{ status: string }>, string>({
      query: (reference) => `/fees-online/verify?reference=${encodeURIComponent(reference)}`,
      invalidatesTags: [{ type: 'Fees', id: 'INVOICES' }, { type: 'Fees', id: 'SUMMARY' }, 'Fees'],
    }),

    // Institution admin — payout receiving account
    getPayoutAccount: builder.query<ApiObject<PayoutAccount | null>, void>({
      query: () => '/fees-online/payout-account',
      providesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNT' }],
    }),
    savePayoutAccount: builder.mutation<ApiObject<PayoutAccount>, {
      method: PayoutMethod; accountTitle: string; bankName?: string; accountNumber?: string; iban?: string; walletNumber?: string;
    }>({
      query: (body) => ({ url: '/fees-online/payout-account', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNT' }],
    }),
    getMyPayouts: builder.query<ApiArray<Payout>, void>({
      query: () => '/fees-online/my-payouts',
      providesTags: [{ type: 'Fees', id: 'MY_PAYOUTS' }],
    }),
    getMyOwed: builder.query<ApiObject<{ gross: number; paymentCount: number; oldestUnpaidAt: string | null; pendingClawback: number }>, void>({
      query: () => '/fees-online/my-owed',
      providesTags: [{ type: 'Fees', id: 'MY_OWED' }],
    }),

    // Superadmin — payouts
    getInstitutionsOwed: builder.query<ApiArray<InstitutionOwed>, void>({
      query: () => '/fees-online/owed',
      providesTags: [{ type: 'Fees', id: 'OWED' }],
    }),
    verifyInstitutionPayoutAccount: builder.mutation<ApiObject<PayoutAccount>, string>({
      query: (institutionId) => ({ url: `/fees-online/${institutionId}/payout-account/verify`, method: 'POST' }),
      invalidatesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNT' }],
    }),
    generatePayout: builder.mutation<ApiObject<Payout>, string>({
      query: (institutionId) => ({ url: `/fees-online/${institutionId}/payouts/generate`, method: 'POST' }),
      invalidatesTags: [{ type: 'Fees', id: 'OWED' }, { type: 'Fees', id: 'PAYOUTS' }],
    }),
    getPayouts: builder.query<ApiArray<Payout>, { institutionId?: string } | void>({
      query: (params) => {
        const institutionId = params?.institutionId;
        return `/fees-online/payouts${institutionId ? `?institutionId=${institutionId}` : ''}`;
      },
      providesTags: [{ type: 'Fees', id: 'PAYOUTS' }],
    }),
    markPayoutPaid: builder.mutation<ApiObject<Payout>, { payoutId: string; paidVia: string; paidReference?: string }>({
      query: ({ payoutId, ...body }) => ({ url: `/fees-online/payouts/${payoutId}/mark-paid`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'PAYOUTS' }],
    }),

    runReconciliation: builder.mutation<ApiObject<{ checked: number; settled: number; failed: number; abandoned: number }>, void>({
      query: () => ({ url: '/fees-online/reconcile/run', method: 'POST' }),
      invalidatesTags: [{ type: 'Fees', id: 'OWED' }, { type: 'Fees', id: 'PAYOUTS' }, { type: 'Fees', id: 'NEEDS_REFUND' }],
    }),
    getNeedsRefund: builder.query<ApiArray<NeedsRefundPayment>, void>({
      query: () => '/fees-online/needs-refund',
      providesTags: [{ type: 'Fees', id: 'NEEDS_REFUND' }],
    }),
    resolveNeedsRefund: builder.mutation<ApiObject<unknown>, { paymentId: string; note: string }>({
      query: ({ paymentId, ...body }) => ({ url: `/fees-online/needs-refund/${paymentId}/resolve`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'NEEDS_REFUND' }],
    }),
  }),
});

export interface NeedsRefundPayment {
  id: string;
  institutionId: string;
  institutionName: string | null;
  studentRollNumber: string | null;
  invoiceId: string;
  amount: number;
  gateway: string;
  reference: string;
  failureReason: string;
  completedAt: string;
}

export const {
  useGetGatewayStatusQuery,
  useInitiateOnlineCheckoutMutation,
  useVerifyOnlinePaymentMutation,
  useGetPayoutAccountQuery,
  useSavePayoutAccountMutation,
  useGetMyPayoutsQuery,
  useGetMyOwedQuery,
  useGetInstitutionsOwedQuery,
  useVerifyInstitutionPayoutAccountMutation,
  useGeneratePayoutMutation,
  useGetPayoutsQuery,
  useMarkPayoutPaidMutation,
  useGetNeedsRefundQuery,
  useResolveNeedsRefundMutation,
  useRunReconciliationMutation,
} = feesOnlineApi;
