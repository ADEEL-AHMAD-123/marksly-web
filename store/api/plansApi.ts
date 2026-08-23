import { baseApi } from './baseApi';

export interface Plan {
  key: string;
  name: string;
  price: number;
  studentsLimit: number;
  storageGB: number;
  features: string[];
}

interface PlansResponse {
  success: boolean;
  data: Plan[];
  message: string;
}

export const plansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Public catalog — no auth needed. Same data billing.service.ts
    // actually charges institutions, so the marketing pricing page can
    // never silently drift out of sync with real prices.
    getPublicPlans: builder.query<PlansResponse, void>({
      query: () => '/plans',
    }),
  }),
});

export const { useGetPublicPlansQuery } = plansApi;
