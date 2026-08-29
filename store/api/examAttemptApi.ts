import { baseApi } from './baseApi';

// ─── Shared shapes (mirrors exam.model.ts / exam-attempt.model.ts exactly) ──

export type IntegrityMode = 'none' | 'flag_only' | 'fullscreen_lock';
export type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'numeric';
export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_graded' | 'needs_review' | 'graded' | 'published';
export type IntegrityFlagType = 'tab_blur' | 'fullscreen_exit' | 'time_anomaly';

interface ApiObject<T> { success: boolean; data: T; message: string }

export interface MyOnlineExamItem {
  id: string;
  title: string;
  subjectName: string | null;
  durationMinutes: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  maxAttempts: number;
  integrityMode: IntegrityMode;
  attemptsUsed: number;
  hasInProgressAttempt: boolean;
  canEnter: boolean;
}

export interface StartAttemptResult {
  id: string;
  attemptNumber: number;
  startedAt: string;
  durationMinutes: number;
  windowEnd: string | null;
  integrityMode: IntegrityMode;
  questionOrder: number[] | null;
  optionOrders: { questionIndex: number; order: number[] }[] | null;
}

export interface AttemptQuestionOption {
  optionIndex: number;
  text: string;
}

// `questionIndex` is the ORIGINAL frozen-question index — always echo this
// back in saveAnswer(), never the display position (see
// exam-attempt.service.ts#getMyAttemptState).
export interface AttemptQuestion {
  questionIndex: number;
  type: QuestionType;
  text: string;
  marks: number;
  negativeMarks: number;
  options?: AttemptQuestionOption[];
}

export interface AttemptAnswer {
  questionIndex: number;
  response: string | string[];
}

export interface MyAttemptExam {
  id: string;
  title: string;
  subjectName: string | null;
  durationMinutes: number;
  windowStart: string | null;
  windowEnd: string | null;
  integrityMode: IntegrityMode;
  maxAttempts: number;
}

export interface MyAttemptCurrent {
  id: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  answers: AttemptAnswer[];
}

export interface MyAttemptState {
  exam: MyAttemptExam;
  questions: AttemptQuestion[];
  attempt: MyAttemptCurrent | null;
}

export interface SubmitAttemptResult {
  id: string;
  status: AttemptStatus;
  totalAwarded: number;
}

export const examAttemptApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    myOnlineExams: builder.query<ApiObject<MyOnlineExamItem[]>, void>({
      query: () => '/exams/online/mine',
      providesTags: [{ type: 'Exams', id: 'ONLINE-MINE' }],
    }),
    getMyAttemptState: builder.query<ApiObject<MyAttemptState>, string>({
      query: (examId) => `/exams/${examId}/my-attempt`,
      providesTags: (_r, _e, examId) => [{ type: 'Exams', id: `ATTEMPT-${examId}` }],
    }),
    startAttempt: builder.mutation<ApiObject<StartAttemptResult>, string>({
      query: (examId) => ({ url: `/exams/${examId}/attempts/start`, method: 'POST' }),
      invalidatesTags: (_r, _e, examId) => [{ type: 'Exams', id: `ATTEMPT-${examId}` }, { type: 'Exams', id: 'ONLINE-MINE' }],
    }),
    saveAnswer: builder.mutation<ApiObject<{ saved: boolean }>, { attemptId: string; questionIndex: number; response: string | string[] }>({
      query: ({ attemptId, questionIndex, response }) => ({
        url: `/attempts/${attemptId}/answer`,
        method: 'PATCH',
        body: { questionIndex, response },
      }),
      // Deliberately no invalidatesTags — autosave shouldn't trigger a
      // refetch of the whole attempt state (would blow away in-flight local
      // edits); the client keeps its own optimistic copy of answers.
    }),
    logIntegrityFlag: builder.mutation<ApiObject<{ logged: boolean }>, { attemptId: string; type: IntegrityFlagType }>({
      query: ({ attemptId, type }) => ({
        url: `/attempts/${attemptId}/integrity-flag`,
        method: 'POST',
        body: { type },
      }),
    }),
    submitAttempt: builder.mutation<ApiObject<SubmitAttemptResult>, { attemptId: string; examId: string; autoSubmitted: boolean }>({
      query: ({ attemptId, autoSubmitted }) => ({
        url: `/attempts/${attemptId}/submit`,
        method: 'POST',
        body: { autoSubmitted },
      }),
      invalidatesTags: (_r, _e, { examId }) => [{ type: 'Exams', id: `ATTEMPT-${examId}` }, { type: 'Exams', id: 'ONLINE-MINE' }, 'Results'],
    }),
  }),
});

export const {
  useMyOnlineExamsQuery,
  useGetMyAttemptStateQuery,
  useStartAttemptMutation,
  useSaveAnswerMutation,
  useLogIntegrityFlagMutation,
  useSubmitAttemptMutation,
} = examAttemptApi;
