import { baseApi } from './baseApi';

export type ExamType = 'midterm' | 'final' | 'unit' | 'monthly' | 'board';

export interface ExamListItem {
  id: string;
  title: string;
  type: ExamType;
  className: string | null;
  classId: string | null;
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
  grade: string | null;
  isPassed: boolean | null;
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
  academicYear?: string;
  examDate?: string;
  subjects: { name: string; totalMarks: number; passingMarks?: number }[];
}

export interface SaveResultsBody {
  examId: string;
  records: { studentId: string; marks: { name: string; obtained: number }[] }[];
}

export const examsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExams: builder.query<ApiArray<ExamListItem>, { classId?: string } | void>({
      query: (params) => `/exams${params?.classId ? `?classId=${params.classId}` : ''}`,
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
  }),
});

export const {
  useGetExamsQuery,
  useCreateExamMutation,
  useGetExamResultsQuery,
  useSaveExamResultsMutation,
  usePublishExamMutation,
} = examsApi;
