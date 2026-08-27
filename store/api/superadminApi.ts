import { baseApi } from './baseApi';

export interface PlatformOverview {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  pastDue: number;
  newThisMonth: number;
  totalStudents: number;
  mrr: number;
}

export interface InstitutionRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string | null;
  plan: string;
  status: 'active' | 'trial' | 'suspended' | 'pending' | 'past_due';
  students: number;
  createdAt: string;
  autoRenew: boolean;
}

export interface RevenueSubscription {
  id: string;
  institution: string;
  plan: string;
  monthlyAmount: number;
  status: string;
  since: string;
  nextBillingAt: string | null;
}

export interface RevenuePayment {
  institution: string;
  plan: string;
  amount: number;
  gateway: string;
  paidAt: string;
}

export interface RevenueData {
  mrr: number;
  arr: number;
  planDistribution: { name: string; value: number }[];
  trend: { label: string; mrr: number }[];
  subscriptions: RevenueSubscription[];
  payments: RevenuePayment[];
}

export interface Plan {
  id: string;
  key: string;
  name: string;
  price: number;
  studentsLimit: number;
  storageGB: number;
  features: string[];
  isActive: boolean;
  // false = a bespoke, institution-specific plan (a custom deal negotiated
  // after that institution requested one) — hidden from the public pricing
  // page and from every OTHER institution's own plan picker. See
  // Plan.isPublic's comment on the backend (plan.model.ts).
  isPublic: boolean;
}

export interface PlanBody {
  key?: string;
  name: string;
  price: number;
  studentsLimit: number;
  storageGB: number;
  features?: string[];
  isPublic?: boolean;
}

export interface InstitutionDetail {
  institution: {
    id: string; name: string; slug: string; type: string; status: InstitutionRow['status'];
    plan: string; contactEmail: string | null; contactPhone: string | null;
    city: string | null; province: string | null; createdAt: string;
    trialEndsAt: string | null; monthlyAmount: number; studentsLimit: number | null;
    subscribedSince: string | null; lastPaymentAt: string | null; nextBillingAt: string | null;
    autoRenew: boolean; savedCardLast4: string | null;
  };
  counts: { students: number; teachers: number; classes: number; subjects: number };
  classes: { id: string; name: string; academicYear: string; sections: { name: string; students: number }[] }[];
  subjects: { id: string; name: string; code: string | null; className: string | null; teacherName: string | null }[];
  teachers: { id: string; name: string; phone: string; email: string | null; isActive: boolean }[];
  recentStudents: { id: string; name: string; rollNumber: string; className: string | null }[];
  payments: { amount: number; gateway: string; status: string; paidAt: string; origin: 'bank_transfer' | 'auto_renewal' | 'checkout' }[];
  chargeAttempts: {
    attemptedAt: string;
    amount: number;
    success: boolean;
    reasonCode: 'insufficient_funds' | 'expired_card' | 'card_blocked' | 'auth_failed' | 'gateway_error' | 'other' | null;
  }[];
}

export interface PlanHistoryEntry {
  id: string;
  fromPlan: string | null;
  toPlan: string | null;
  source: 'payment' | 'self_serve_free' | 'scheduled_downgrade' | 'admin_override' | 'unknown';
  amount: number | null;
  gateway: string | null;
  byAdmin: string | null;
  at: string;
}

export interface BankDetails {
  bankName: string;
  bankAccountTitle: string;
  bankIban: string;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export const superadminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformOverview: builder.query<ApiObject<PlatformOverview>, void>({
      query: () => '/superadmin/overview',
      providesTags: [{ type: 'Institutions', id: 'OVERVIEW' }],
    }),
    getInstitutions: builder.query<
      ApiArray<InstitutionRow>,
      { search?: string; status?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const s = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) s.set(k, String(v));
        });
        const qs = s.toString();
        return `/superadmin/institutions${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Institutions', id: 'LIST' }],
    }),
    getRevenue: builder.query<ApiObject<RevenueData>, void>({
      query: () => '/superadmin/revenue',
      providesTags: [{ type: 'Institutions', id: 'REVENUE' }],
    }),
    getPlans: builder.query<ApiObject<Plan[]>, void>({
      query: () => '/superadmin/plans',
      providesTags: [{ type: 'Institutions', id: 'PLANS' }],
    }),
    createPlan: builder.mutation<ApiObject<{ id: string }>, PlanBody>({
      query: (body) => ({ url: '/superadmin/plans', method: 'POST', body }),
      invalidatesTags: [{ type: 'Institutions', id: 'PLANS' }],
    }),
    updatePlan: builder.mutation<ApiObject<unknown>, { id: string; body: Partial<PlanBody> & { isActive?: boolean } }>({
      query: ({ id, body }) => ({ url: `/superadmin/plans/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Institutions', id: 'PLANS' }],
    }),
    deletePlan: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/superadmin/plans/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Institutions', id: 'PLANS' }],
    }),
    getInstitution: builder.query<ApiObject<InstitutionDetail>, string>({
      query: (id) => `/superadmin/institutions/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Institutions', id }],
    }),
    getInstitutionStudents: builder.query<
      ApiArray<{ id: string; name: string; rollNumber: string; className: string | null; status: string }>,
      { id: string; search?: string; page?: number; limit?: number }
    >({
      query: ({ id, ...params }) => {
        const s = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) s.set(k, String(v)); });
        const qs = s.toString();
        return `/superadmin/institutions/${id}/students${qs ? `?${qs}` : ''}`;
      },
    }),
    updateInstitution: builder.mutation<
      ApiObject<unknown>,
      { id: string; body: { status?: string; planType?: string } }
    >({
      query: ({ id, body }) => ({ url: `/superadmin/institutions/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Institutions', id },
        { type: 'Institutions', id: 'LIST' },
        { type: 'Institutions', id: 'OVERVIEW' },
        { type: 'Institutions', id: 'REVENUE' },
        { type: 'Institutions', id: `${id}-PLAN-HISTORY` },
      ],
    }),
    getPlanHistory: builder.query<ApiObject<PlanHistoryEntry[]>, string>({
      query: (id) => `/superadmin/institutions/${id}/plan-history`,
      providesTags: (_r, _e, id) => [{ type: 'Institutions', id: `${id}-PLAN-HISTORY` }],
    }),
    getBankDetails: builder.query<ApiObject<BankDetails>, void>({
      query: () => '/superadmin/bank-details',
      providesTags: [{ type: 'Institutions', id: 'BANK_DETAILS' }],
    }),
    updateBankDetails: builder.mutation<ApiObject<BankDetails>, Partial<BankDetails>>({
      query: (body) => ({ url: '/superadmin/bank-details', method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Institutions', id: 'BANK_DETAILS' }],
    }),
  }),
});

export const {
  useGetPlatformOverviewQuery,
  useGetInstitutionsQuery,
  useGetRevenueQuery,
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
  useGetInstitutionQuery,
  useGetInstitutionStudentsQuery,
  useUpdateInstitutionMutation,
  useGetPlanHistoryQuery,
  useGetBankDetailsQuery,
  useUpdateBankDetailsMutation,
} = superadminApi;
