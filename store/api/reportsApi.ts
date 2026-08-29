import { baseApi } from './baseApi';
import type { GradingSchemeType } from './gradingSchemesApi';

export interface ReportsData {
  overview: {
    activeStudents: number;
    classes: number;
    collectedThisMonth: number;
    avgAttendance: number;
    passRate: number;
  };
  attendanceTrend: { label: string; rate: number }[];
  feeCollection: { label: string; amount: number }[];
  studentsByClass: { name: string; value: number }[];
  // Segmented by the effective GradingScheme type of the classes behind
  // each result — see report.service.ts's gradeDistribution(). Only scheme
  // types that actually have results are present as keys.
  gradeDistribution: Partial<Record<GradingSchemeType, { name: string; value: number }[]>>;
}

interface ApiObject<T> { success: boolean; data: T; message: string }

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReports: builder.query<ApiObject<ReportsData>, void>({
      query: () => '/reports/dashboard',
      // Bare (id-less) tags only refetch when a mutation explicitly
      // invalidates that SAME bare tag — RTK Query matches {type, id}
      // exactly, so a mutation that only invalidates e.g. {type: 'Fees',
      // id: 'INVOICES'} will NOT refresh a query that provides bare 'Fees'.
      // Every mutation that should be reflected here (attendance marks, fee
      // payments, exam publishing, student CRUD) has been checked to make
      // sure it also invalidates the matching bare tag — see the comments
      // next to those invalidatesTags in attendanceApi/feesApi/examsApi/
      // studentsApi/termsApi.
      // 'Classes' added — gradeDistribution now segments by each class's
      // effective grading scheme type, so reassigning a class's
      // gradingSchemeId (ClassesView.tsx) must also refresh this report.
      providesTags: ['Students', 'Attendance', 'Fees', 'Exams', 'Results', 'Classes'],
    }),
  }),
});

export const { useGetReportsQuery } = reportsApi;
