import { baseApi } from './baseApi';

// 'waived' exists in the backend's enum (fee-invoice.model.ts) but there is
// currently no code path that ever sets it -- included here anyway so every
// consumer (status badges, filters) is forced to handle it rather than
// silently crashing the day a void/waive flow is added.
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
// 'safepay' is the online-gateway method (fee-online.service.ts's settle()
// records payments with paymentMethod: claimed.gateway) -- included so this
// type doesn't silently diverge from the backend's actual enum
// (fee-payment.model.ts), even though the manual "Collect Payment" form
// below intentionally only offers the in-person subset.
export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank' | 'cash' | 'cheque' | 'challan' | 'safepay';

export type FeeCategory = 'tuition' | 'admission' | 'transport' | 'hostel' | 'library' | 'sports' | 'exam' | 'misc';
export type FeeApplicabilityMode = 'all-students-in-class' | 'opt-in' | 'one-time-event';
export type ProrationPolicy = 'full' | 'prorate-daily' | 'skip-first-period';

export interface FeeStructure {
  id: string;
  name: string;
  academicYear: string;
  termId: string | null;
  category: FeeCategory;
  applicabilityMode: FeeApplicabilityMode;
  className: string | null;
  classId: string | null;
  isActive: boolean;
  autoBill: boolean;
  dueDay: number;
  prorationPolicy: ProrationPolicy;
  total: number;
  components: { name: string; amount: number; frequency: string }[];
}

export interface StudentOptIn {
  id: string;
  feeStructureId: string;
  structureName: string | null;
  category: FeeCategory | null;
  startDate: string;
  endDate: string | null;
  detail: string | null;
  active: boolean;
}

export const PAKISTANI_BANKS = [
  'HBL', 'UBL', 'MCB', 'Meezan Bank', 'Bank Alfalah', 'Bank Al Habib',
  'Faysal Bank', 'Askari Bank', 'National Bank of Pakistan', 'Standard Chartered',
  'JS Bank', 'Soneri Bank', 'Bank of Punjab', 'Allied Bank', 'Habib Metropolitan Bank',
  'Silkbank', 'Summit Bank', 'Sindh Bank', 'First Women Bank', 'Al Baraka Bank',
  'Dubai Islamic Bank Pakistan', 'MCB Islamic Bank', 'Bank of Khyber', 'Bank of Azad Jammu & Kashmir',
  'SME Bank', 'Zarai Taraqiati Bank', 'Other',
] as const;

export interface PayoutAccount {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branch: string | null;
  label: string | null;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  studentName: string;
  rollNumber: string;
  structureName: string | null;
  dueDate: string;
  month: number | null;
  year: number | null;
  netAmount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
}

export interface FeesSummary {
  collectedThisMonth: number;
  collectedToday: number;
  paymentsToday: number;
  outstanding: number;
  pendingInvoices: number;
}

export interface FeeCardRow {
  invoiceId: string;
  month: number | null;
  year: number | null;
  structureName: string | null;
  dueDate: string;
  netAmount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  challanNumber: string | null;
}

export interface FeeCard {
  studentName: string;
  rollNumber: string | null;
  rows: FeeCardRow[];
  totals: { billed: number; paid: number; balance: number };
}

export interface InvoiceDetail {
  id: string;
  studentName: string;
  rollNumber: string | null;
  structureName: string | null;
  dueDate: string;
  month: number | null;
  year: number | null;
  totalAmount: number;
  discountAmount: number;
  fineAmount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  payments: { id: string; amountPaid: number; paymentMethod: PaymentMethod; receiptNumber: string | null; paymentDate: string; voided: boolean; voidReason: string | null }[];
  adjustments: { id: string; type: 'credit' | 'debit'; amount: number; reason: string; createdAt: string }[];
  auditLog: { action: string; at: string; note: string | null }[];
}

export interface AdjustBody {
  invoiceId: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateStructureBody {
  name: string;
  academicYear: string;
  termId?: string;
  category?: FeeCategory;
  applicabilityMode?: FeeApplicabilityMode;
  classId?: string;
  components: { name: string; amount: number; frequency?: string }[];
  autoBill?: boolean;
  dueDay?: number;
  prorationPolicy?: ProrationPolicy;
}

export interface UpdateStructureBody {
  name?: string;
  isActive?: boolean;
  autoBill?: boolean;
  dueDay?: number;
  prorationPolicy?: ProrationPolicy;
  termId?: string;
  category?: FeeCategory;
  applicabilityMode?: FeeApplicabilityMode;
  components?: { name: string; amount: number; frequency?: string }[];
}

export interface CreateOptInBody {
  studentId: string;
  feeStructureId: string;
  startDate?: string;
  detail?: string;
}

export interface CreatePayoutAccountBody {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branch?: string;
  label?: string;
  isDefault?: boolean;
}

export interface CreateAdhocInvoiceBody {
  studentIds?: string[];
  classId?: string;
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface GenerateBody {
  feeStructureId: string;
  month: number;
  year: number;
  dueDate: string;
}

export interface PaymentBody {
  invoiceId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  challanNumber?: string;
  paymentDate?: string;
  notes?: string;
  allowOverpaymentCredit?: boolean;
}

export interface RecordPaymentResult {
  invoiceId: string;
  receiptNumber: string;
  paidAmount: number;
  creditBanked: number;
  balance: number;
  status: InvoiceStatus;
}

export const feesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeeStructures: builder.query<ApiArray<FeeStructure>, void>({
      query: () => '/fees/structures',
      providesTags: [{ type: 'Fees', id: 'STRUCTURES' }],
    }),
    createFeeStructure: builder.mutation<ApiObject<{ id: string }>, CreateStructureBody>({
      query: (body) => ({ url: '/fees/structures', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'STRUCTURES' }],
    }),
    // isActive/autoBill/dueDay/components/name are all independently
    // editable; classId and academicYear are deliberately excluded (backend
    // rejects them silently by ignoring the fields, see updateStructureSchema).
    updateFeeStructure: builder.mutation<ApiObject<{ id: string }>, { id: string } & UpdateStructureBody>({
      query: ({ id, ...body }) => ({ url: `/fees/structures/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Fees', id: 'STRUCTURES' }],
    }),

    getInvoices: builder.query<
      ApiArray<Invoice>,
      { page?: number; limit?: number; status?: InvoiceStatus; classId?: string; search?: string } | void
    >({
      query: (params) => {
        const s = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) s.set(k, String(v));
        });
        const qs = s.toString();
        return `/fees/invoices${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Fees', id: 'INVOICES' }],
    }),
    // Both of these create brand-new invoices — a parent's "fees due" view
    // (portalApi's myFees/childFees/myChildren, which provide the bare
    // 'Fees' tag) needs to see those the moment they're generated, not just
    // the admin-facing invoice list.
    generateInvoices: builder.mutation<ApiObject<{ created: number; skipped: number }>, GenerateBody>({
      query: (body) => ({ url: '/fees/invoices/generate', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'INVOICES' }, { type: 'Fees', id: 'SUMMARY' }, 'Fees'],
    }),

    runBilling: builder.mutation<ApiObject<{ created: number; skipped: number; structures: number }>, { month: number; year: number }>({
      query: (body) => ({ url: '/fees/invoices/run-billing', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'INVOICES' }, { type: 'Fees', id: 'SUMMARY' }, 'Fees'],
    }),

    getInvoiceDetail: builder.query<ApiObject<InvoiceDetail>, string>({
      query: (id) => `/fees/invoices/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Fees', id: `INVOICE-${id}` }],
    }),
    // Both admin-only corrections (see fee.service.ts's voidPayment()/
    // voidInvoice()) -- invalidate the same tag set as adjustInvoice/
    // recordPayment above so every cached view (this invoice's detail, the
    // list, the summary, and the student/parent portal's bare 'Fees' tag)
    // refreshes consistently.
    voidPayment: builder.mutation<ApiObject<{ id: string; voided: boolean }>, { invoiceId: string; paymentId: string; reason: string }>({
      query: ({ paymentId, reason }) => ({ url: `/fees/payments/${paymentId}/void`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { invoiceId }) => [
        { type: 'Fees', id: 'INVOICES' },
        { type: 'Fees', id: 'SUMMARY' },
        { type: 'Fees', id: `INVOICE-${invoiceId}` },
        'Fees',
      ],
    }),
    voidInvoice: builder.mutation<ApiObject<{ id: string; status: InvoiceStatus }>, { invoiceId: string; reason: string }>({
      query: ({ invoiceId, reason }) => ({ url: `/fees/invoices/${invoiceId}/void`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { invoiceId }) => [
        { type: 'Fees', id: 'INVOICES' },
        { type: 'Fees', id: 'SUMMARY' },
        { type: 'Fees', id: `INVOICE-${invoiceId}` },
        'Fees',
      ],
    }),
    adjustInvoice: builder.mutation<ApiObject<unknown>, AdjustBody>({
      query: ({ invoiceId, ...body }) => ({ url: `/fees/invoices/${invoiceId}/adjust`, method: 'POST', body }),
      // Also invalidate the bare 'Fees' tag — RTK Query only matches
      // invalidation by exact {type, id}, so without this the student/parent
      // portal's myFees/childFees/myChildren (which provide the bare tag,
      // no id) would never refresh after an admin adjusts an invoice here.
      invalidatesTags: (_r, _e, { invoiceId }) => [
        { type: 'Fees', id: 'INVOICES' },
        { type: 'Fees', id: 'SUMMARY' },
        { type: 'Fees', id: `INVOICE-${invoiceId}` },
        'Fees',
      ],
    }),

    recordPayment: builder.mutation<ApiObject<RecordPaymentResult>, PaymentBody>({
      query: (body) => ({ url: '/fees/payments', method: 'POST', body }),
      // Same as adjustInvoice above — a parent's cached "fees due" view
      // needs the bare 'Fees' tag invalidated too, not just the specific
      // admin-facing cache entries.
      invalidatesTags: (_r, _e, { invoiceId }) => [
        { type: 'Fees', id: 'INVOICES' },
        { type: 'Fees', id: 'SUMMARY' },
        { type: 'Fees', id: `INVOICE-${invoiceId}` },
        'Fees',
      ],
    }),

    getFeesSummary: builder.query<ApiObject<FeesSummary>, void>({
      query: () => '/fees/summary',
      providesTags: [{ type: 'Fees', id: 'SUMMARY' }],
    }),

    getFeeCard: builder.query<ApiObject<FeeCard>, { studentId: string; academicYear?: string }>({
      query: ({ studentId, academicYear }) =>
        `/fees/students/${studentId}/card${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`,
      providesTags: (_r, _e, { studentId }) => [{ type: 'Fees', id: `CARD-${studentId}` }],
    }),

    generateTermInvoices: builder.mutation<ApiObject<{ created: number; skipped: number; termName: string }>, { feeStructureId: string; termId: string }>({
      query: (body) => ({ url: '/fees/invoices/generate-term', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'INVOICES' }, { type: 'Fees', id: 'SUMMARY' }, 'Fees'],
    }),

    createAdhocInvoices: builder.mutation<ApiObject<{ created: number; invoiceIds: string[] }>, CreateAdhocInvoiceBody>({
      query: (body) => ({ url: '/fees/invoices/adhoc', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'INVOICES' }, { type: 'Fees', id: 'SUMMARY' }, 'Fees'],
    }),

    getStudentOptIns: builder.query<ApiArray<StudentOptIn>, string>({
      query: (studentId) => `/fees/students/${studentId}/opt-ins`,
      providesTags: (_r, _e, studentId) => [{ type: 'Fees', id: `OPTINS-${studentId}` }],
    }),
    createOptIn: builder.mutation<ApiObject<{ id: string }>, CreateOptInBody>({
      query: (body) => ({ url: '/fees/opt-ins', method: 'POST', body }),
      invalidatesTags: (_r, _e, { studentId }) => [{ type: 'Fees', id: `OPTINS-${studentId}` }],
    }),
    endOptIn: builder.mutation<ApiObject<{ id: string }>, { id: string; studentId: string; endDate?: string }>({
      query: ({ id, endDate }) => ({ url: `/fees/opt-ins/${id}/end`, method: 'POST', body: { endDate } }),
      invalidatesTags: (_r, _e, { studentId }) => [{ type: 'Fees', id: `OPTINS-${studentId}` }],
    }),

    getPayoutAccounts: builder.query<ApiArray<PayoutAccount>, void>({
      query: () => '/fees/payout-accounts',
      providesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNTS' }],
    }),
    createPayoutAccount: builder.mutation<ApiObject<{ id: string }>, CreatePayoutAccountBody>({
      query: (body) => ({ url: '/fees/payout-accounts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNTS' }],
    }),
    updatePayoutAccount: builder.mutation<ApiObject<{ id: string }>, { id: string } & Partial<CreatePayoutAccountBody> & { isActive?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/fees/payout-accounts/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNTS' }],
    }),
    deletePayoutAccount: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/fees/payout-accounts/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Fees', id: 'PAYOUT_ACCOUNTS' }],
    }),
  }),
});

export const {
  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useUpdateFeeStructureMutation,
  useGetInvoicesQuery,
  useGenerateInvoicesMutation,
  useRunBillingMutation,
  useGetInvoiceDetailQuery,
  useAdjustInvoiceMutation,
  useVoidPaymentMutation,
  useVoidInvoiceMutation,
  useRecordPaymentMutation,
  useGetFeesSummaryQuery,
  useGetFeeCardQuery,
  useGenerateTermInvoicesMutation,
  useCreateAdhocInvoicesMutation,
  useGetStudentOptInsQuery,
  useCreateOptInMutation,
  useEndOptInMutation,
  useGetPayoutAccountsQuery,
  useCreatePayoutAccountMutation,
  useUpdatePayoutAccountMutation,
  useDeletePayoutAccountMutation,
} = feesApi;
