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
  // Backend's own clock at response time — used to compute a clock-skew
  // offset (serverTime - Date.now()) once, so the countdown timer doesn't
  // trust a possibly-wrong device clock (see ExamTakingView.tsx).
  serverTime: string;
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
  serverTime: string;
  exam: MyAttemptExam;
  questions: AttemptQuestion[];
  attempt: MyAttemptCurrent | null;
}

export interface SubmitAttemptResult {
  id: string;
  status: AttemptStatus;
  totalAwarded: number;
}

// ─── Teacher/admin monitoring + grading (mirrors exam-attempt.service.ts's
// listAttemptsForExam / getAttemptForGrading exactly) ────────────────────

export interface IntegrityFlagEntry {
  type: IntegrityFlagType;
  at: string;
}

// 'not_started' is synthetic — never persisted on an ExamAttempt document
// (there IS no attempt yet) — it's how listAttemptsForExam represents a
// roster student who never began the exam at all, so the monitoring screen
// can show them instead of silently omitting them.
export type RosterAttemptStatus = AttemptStatus | 'not_started';

export interface AttemptListItem {
  attemptId: string | null;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  status: RosterAttemptStatus;
  // Only meaningful when status === 'not_started' — true once the exam's
  // window has already closed (so this student missed it outright), false
  // while the window is still open (they simply haven't started yet).
  missed: boolean;
  startedAt: string | null;
  submittedAt: string | null;
  autoSubmitted: boolean;
  totalAwarded: number | null;
  integrityFlagCount: number;
  integrityFlags: IntegrityFlagEntry[];
}

// Every bucket is mutually exclusive — they always sum to `assigned`.
export interface AttemptsForExamSummary {
  assigned: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  autoGraded: number;
  needsReview: number;
  graded: number;
  published: number;
}

export interface AttemptsForExam {
  exam: { id: string; title: string; subjectName: string | null; mode: ExamMode; windowClosed: boolean };
  summary: AttemptsForExamSummary;
  attempts: AttemptListItem[];
}

// Local, since examsApi's ExamMode isn't imported here — mirrors it exactly.
export type ExamMode = 'online' | 'physical' | 'oral' | 'practical' | 'project' | 'assignment';

export interface GradingQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface GradingQuestion {
  questionIndex: number;
  type: QuestionType;
  text: string;
  marks: number;
  negativeMarks: number;
  options?: GradingQuestionOption[];
  correctAnswer: string | null;
  studentResponse: string | string[] | null;
  awardedMarks: number | null;
  isManuallyGraded: boolean;
}

export interface AttemptGradingDetail {
  attempt: {
    id: string;
    examId: string;
    studentId: string;
    studentName: string;
    attemptNumber: number;
    status: AttemptStatus;
    startedAt: string;
    submittedAt: string | null;
    autoSubmitted: boolean;
    totalAwarded: number;
    integrityFlags: IntegrityFlagEntry[];
  };
  exam: { id: string; title: string; subjectName: string | null };
  questions: GradingQuestion[];
}

export interface GradeManualAnswerResult {
  id: string;
  status: AttemptStatus;
  totalAwarded: number;
  gradedByUserId: string;
}

export interface PublishAttemptResultResponse {
  id: string;
  status: AttemptStatus;
  percentage: number;
  grade: string;
  isPassed: boolean;
}

export interface TeacherAttentionItem {
  examId: string;
  title: string;
  className: string | null;
  needsReview: number;
  readyToPublish: number;
}

export const examAttemptApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    myOnlineExams: builder.query<ApiObject<MyOnlineExamItem[]>, void>({
      query: () => '/exams/online/mine',
      providesTags: [{ type: 'Exams', id: 'ONLINE-MINE' }],
    }),
    // Teacher dashboard "needs your attention" summary — see
    // exam-attempt.service.ts#teacherAttentionSummary for why this exists
    // as its own endpoint rather than being folded into getExams: the
    // exam-level published flag never flips for online exams, so a
    // per-exam list can't answer "does this need grading/publishing"
    // without also fetching every exam's attempts.
    teacherExamAttention: builder.query<ApiObject<TeacherAttentionItem[]>, void>({
      query: () => '/exams/online/my-attention',
      providesTags: [{ type: 'Exams', id: 'ONLINE-ATTENTION' }],
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
      invalidatesTags: (_r, _e, { examId }) => [
        { type: 'Exams', id: `ATTEMPT-${examId}` },
        { type: 'Exams', id: 'ONLINE-MINE' },
        // A fresh submission may now need grading/publishing — the
        // teacher's dashboard attention count should reflect it.
        { type: 'Exams', id: 'ONLINE-ATTENTION' },
        'Results',
      ],
    }),

    // ─── Teacher/admin monitoring + grading ──────────────────────────────
    listAttemptsForExam: builder.query<ApiObject<AttemptsForExam>, string>({
      query: (examId) => `/exams/${examId}/attempts`,
      providesTags: (_r, _e, examId) => [{ type: 'Exams', id: `ATTEMPTS-LIST-${examId}` }],
    }),
    getAttemptForGrading: builder.query<ApiObject<AttemptGradingDetail>, string>({
      query: (attemptId) => `/attempts/${attemptId}/grading-detail`,
      providesTags: (_r, _e, attemptId) => [{ type: 'Exams', id: `ATTEMPT-DETAIL-${attemptId}` }],
    }),
    gradeManualAnswer: builder.mutation<ApiObject<GradeManualAnswerResult>, { attemptId: string; examId: string; questionIndex: number; marks: number }>({
      query: ({ attemptId, questionIndex, marks }) => ({
        url: `/attempts/${attemptId}/grade`,
        method: 'PATCH',
        body: { questionIndex, marks },
      }),
      invalidatesTags: (_r, _e, { attemptId, examId }) => [
        { type: 'Exams', id: `ATTEMPT-DETAIL-${attemptId}` },
        { type: 'Exams', id: `ATTEMPTS-LIST-${examId}` },
        // ExamsView.tsx's card grid (getExams, tag {type:'Exams', id:'LIST'})
        // shows a gradedCount-derived badge — without this, a teacher who
        // grades a question and navigates back to the exam grid sees a
        // stale Pending/Graded status until an unrelated refetch happens.
        { type: 'Exams', id: 'LIST' },
        { type: 'Exams', id: 'ONLINE-ATTENTION' },
      ],
    }),
    publishAttemptResult: builder.mutation<ApiObject<PublishAttemptResultResponse>, { attemptId: string; examId: string }>({
      query: ({ attemptId }) => ({ url: `/attempts/${attemptId}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, { attemptId, examId }) => [
        { type: 'Exams', id: `ATTEMPT-DETAIL-${attemptId}` },
        { type: 'Exams', id: `ATTEMPTS-LIST-${examId}` },
        { type: 'Exams', id: 'LIST' },
        { type: 'Exams', id: 'ONLINE-ATTENTION' },
        'Results',
      ],
    }),
  }),
});

export const {
  useMyOnlineExamsQuery,
  useTeacherExamAttentionQuery,
  useGetMyAttemptStateQuery,
  useStartAttemptMutation,
  useSaveAnswerMutation,
  useLogIntegrityFlagMutation,
  useSubmitAttemptMutation,
  useListAttemptsForExamQuery,
  useGetAttemptForGradingQuery,
  useGradeManualAnswerMutation,
  usePublishAttemptResultMutation,
} = examAttemptApi;
