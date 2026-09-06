import { baseApi } from './baseApi';

export interface DashboardAlert {
  key: string;
  severity: 'danger' | 'warning';
  title: string;
  message: string;
  count: number;
  ctaLabel: string;
  ctaHref: string;
}

interface ApiList<T> { success: boolean; data: T[]; message: string }

export const dashboardAlertsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Polled from AdminDashboard.tsx while it's open — each fetch also
    // reconciles the notification inbox server-side (see
    // dashboard-alerts.service.ts's syncAndGetAlerts()), so the bell's
    // unread count and this banner always agree on what's currently
    // outstanding.
    getDashboardAlerts: builder.query<ApiList<DashboardAlert>, void>({
      query: () => '/dashboard-alerts',
      providesTags: [{ type: 'DashboardAlerts', id: 'LIST' }],
    }),
  }),
});

export const { useGetDashboardAlertsQuery } = dashboardAlertsApi;
