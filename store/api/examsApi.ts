import { baseApi } from './baseApi';
import type { GradingSchemeType, GradingSchemeConfig } from './gradingSchemesApi';

export type ExamType = 'midterm' | 'final' | 'unit' | 'monthly' | 'board';

// Mirrors backend exam.service.ts's getResultsRoster() — the class's own
// scheme if assigned, else the institution's default. `null` only when
// neither exists (should never happen for a properly-seeded institution,
// but the client must not crash if it does).
export interface ExamGradingScheme {
  id: string;
  name: string;
  type: GradingSchemeType;
  config: GradingSchemeConfig;
}

export interface ExamListItem {
  id: string;
  title: string;
  type: ExamType;
  className: string | null;
  classId: string | null;
  // Legacy free-text label predating the Term migration. Backend
  // (exam.model.ts) still stores/accepts it as an optional plain string,
  // but it is NOT wired to Term in any way and is unused in the UI —
  // do not use this for term display/filtering, use termId/termName
  // wherever those exist instead.
  academicYear: string | null;
  examDate: string | null;
  status: 'scheduled' | 'ongoing' | 'completed';
  published: boolean;
  subjectCount: number;
  gradedCount: number;
  totalMarks: number;
}

export interface ExamSubject {
  name: string;
  totalMarks: number;
  passingMarks: number;
}

export interface RosterStudentResult {
  studentId: string;
  name: string;
  rollNumber: string;
  marks: { name: string; obtained: number | null }[];
  totalObtained: number | null;
  percentage: number | null;
  // Under a cambridge scheme this is the PREDICTED grade only.
  grade: string | null;
  gradePoints: number | null;
  officialGrade: string | null;
  status: 'final' | 'pending' | null;
  isPassed: boolean | null;
  resultId: string | null;
}

export interface ResultsRoster {
  exam: {
    id: string;
    title: string;
    type: ExamType;
    className: string | null;
    published: boolean;
    subjects: ExamSubject[];
    totalMarks: number;
    gradingScheme: ExamGradingScheme | null;
  };
  students: RosterStudentResult[];
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateExamBody {
  title: string;
  type: ExamType;
  classId: string;
  sectionId?: string;
  // Legacy free-text label, unused in UI — see ExamListItem.academicYear.
  academicYear?: string;
  examDate?: string;
  subjects: { name: string; totalMarks: number; passingMarks?: number }[];
}

export interface SaveResultsBody {
  examId: string;
  records: { studentId: string; marks: { name: string; obtained: number }[]; status?: 'final' | 'pending' }[];
}

export interface SetOfficialGradeBody {
  resultId: string;
  officialGrade: string;
  keepPending?: boolean;
}

export const examsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExams: builder.query<ApiArray<ExamListItem>, { classId?: string; termId?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.classId) search.set('classId', params.classId);
        if (params?.termId) search.set('termId', params.termId);
        const qs = search.toString();
        return `/exams${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Exams', id: 'LIST' }],
    }),
    createExam: builder.mutation<ApiObject<{ id: string }>, CreateExamBody>({
      query: (body) => ({ url: '/exams', method: 'POST', body }),
      // Bare 'Exams' too — reportsApi's getReports (admin dashboard)
      // provides the bare tag and would otherwise never refetch when a new
      // exam is created.
      invalidatesTags: [{ type: 'Exams', id: 'LIST' }, 'Exams'],
    }),
    getExamResults: builder.query<ApiObject<ResultsRoster>, string>({
      query: (examId) => `/exams/${examId}/results`,
      providesTags: (_r, _e, id) => [{ type: 'Results', id }],
    }),
    saveExamResults: builder.mutation<ApiObject<{ saved: number }>, SaveResultsBody>({
      query: ({ examId, records }) => ({ url: `/exams/${examId}/results`, method: 'POST', body: { records } }),
      // Also invalidate bare 'Results' — report.service.ts's
      // gradeDistribution() counts every entered result regardless of
      // whether the exam has been published, so the admin reports
      // dashboard should reflect marks the moment they're saved, not just
      // when the exam is later published. (Safe for the student/parent
      // portal too — myResults/childResults still gate on `exam.published`
      // server-side, so this only triggers a no-op refetch for them until
      // publish actually happens.)
      invalidatesTags: (_r, _e, { examId }) => [
        { type: 'Results', id: examId },
        { type: 'Exams', id: 'LIST' },
        'Results',
      ],
    }),
    publishExam: builder.mutation<ApiObject<unknown>, string>({
      query: (examId) => ({ url: `/exams/${examId}/publish`, method: 'POST' }),
      // Also invalidate the bare 'Results' tag — this is the exact moment a
      // student/parent should see new results, but portalApi's
      // myResults/childResults provide the bare tag (no id), which RTK
      // Query's exact {type, id} matching won't invalidate from `{type:
      // 'Results', id: examId}` alone.
      invalidatesTags: (_r, _e, id) => [{ type: 'Results', id }, { type: 'Exams', id: 'LIST' }, 'Results'],
    }),
    // Admin-only (see exam.routes.ts) — records the real, official grade
    // from an external authority (e.g. Cambridge), verbatim, never computed.
    // Recording it also resolves a 'pending' status unless keepPending is set.
    setOfficialGrade: builder.mutation<ApiObject<{ id: string; officialGrade: string; status: 'final' | 'pending' }>, SetOfficialGradeBody>({
      query: ({ resultId, officialGrade, keepPending }) => ({
        url: `/exams/results/${resultId}/official-grade`,
        method: 'PATCH',
        body: { officialGrade, keepPending },
      }),
      // We don't know the examId here, so invalidate the bare 'Results' tag —
      // slightly broader than necessary but this is a low-frequency admin action.
      invalidatesTags: ['Results'],
    }),
  }),
});

export const {
  useGetExamsQuery,
  useCreateExamMutation,
  useGetExamResultsQuery,
  useSaveExamResultsMutation,
  usePublishExamMutation,
  useSetOfficialGradeMutation,
} = examsApi;
