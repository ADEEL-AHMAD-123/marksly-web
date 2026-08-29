import { baseApi } from './baseApi';

export type QuestionType =
  | 'mcq_single'
  | 'mcq_multi'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank'
  | 'numeric';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  subjectName: string;
  topic: string | null;
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  correctAnswer: string | null;
  marks: number;
  negativeMarks: number;
  difficulty: QuestionDifficulty | null;
  isArchived: boolean;
  createdAt: string;
  // Populated client-side on demand via the usage-count endpoint — the
  // list/create/update responses from question.service.ts's mapQuestion()
  // never include it, so callers that need it (the edit drawer's warning
  // banner) fetch it separately per-question.
  usageCount?: number;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string; meta?: { page: number; limit: number; total: number; totalPages: number } }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface ListQuestionsParams {
  subjectName?: string;
  topic?: string;
  type?: QuestionType;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface CreateQuestionBody {
  subjectName: string;
  topic?: string;
  type: QuestionType;
  text: string;
  options?: QuestionOptionInput[];
  correctAnswer?: string;
  marks: number;
  negativeMarks?: number;
  difficulty?: QuestionDifficulty;
}

export type UpdateQuestionBody = Partial<CreateQuestionBody>;

export interface BulkImportQuestionsResult {
  created: number;
  total: number;
  failed: number;
  results: { row: number; status: 'created' | 'error'; message?: string }[];
}

export const questionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getQuestions: builder.query<ApiArray<Question>, ListQuestionsParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.subjectName) search.set('subjectName', params.subjectName);
        if (params?.topic) search.set('topic', params.topic);
        if (params?.type) search.set('type', params.type);
        if (params?.includeArchived) search.set('includeArchived', 'true');
        search.set('page', String(params?.page ?? 1));
        search.set('limit', String(params?.limit ?? 20));
        return `/questions?${search.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((q) => ({ type: 'Questions' as const, id: q.id })),
              { type: 'Questions' as const, id: 'LIST' },
            ]
          : [{ type: 'Questions' as const, id: 'LIST' }],
    }),
    createQuestion: builder.mutation<ApiObject<{ id: string }>, CreateQuestionBody>({
      query: (body) => ({ url: '/questions', method: 'POST', body }),
      invalidatesTags: [{ type: 'Questions', id: 'LIST' }],
    }),
    updateQuestion: builder.mutation<ApiObject<Question>, { id: string; body: UpdateQuestionBody }>({
      query: ({ id, body }) => ({ url: `/questions/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Questions', id }, { type: 'Questions', id: 'LIST' }],
    }),
    archiveQuestion: builder.mutation<ApiObject<{ id: string; isArchived: boolean }>, string>({
      query: (id) => ({ url: `/questions/${id}/archive`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Questions', id }, { type: 'Questions', id: 'LIST' }],
    }),
    getQuestionUsageCount: builder.query<ApiObject<{ usageCount: number }>, string>({
      query: (id) => `/questions/${id}/usage-count`,
      providesTags: (_r, _e, id) => [{ type: 'Questions', id: `USAGE-${id}` }],
    }),
    bulkImportQuestions: builder.mutation<ApiObject<BulkImportQuestionsResult>, { csv: string }>({
      query: (body) => ({ url: '/questions/bulk-import', method: 'POST', body }),
      invalidatesTags: [{ type: 'Questions', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useArchiveQuestionMutation,
  useGetQuestionUsageCountQuery,
  useBulkImportQuestionsMutation,
} = questionsApi;
