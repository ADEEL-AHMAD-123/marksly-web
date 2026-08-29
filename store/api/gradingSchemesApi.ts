import { baseApi } from './baseApi';

// Mirrors backend src/modules/academic/grading-scheme.model.ts /
// grading-scheme.validator.ts / grading-scheme.service.ts (mapScheme())
// exactly.
export type GradingSchemeType = 'percentage_letter' | 'gpa' | 'cambridge' | 'pass_fail';
export type RepeatPolicy = 'replace' | 'average';

export interface PercentageLetterBand {
  grade: string;
  minPercent: number;
}

export interface GpaGradePoint {
  grade: string;
  minPercent: number;
  points: number;
}

export interface CambridgePredictedBand {
  grade: string;
  minPercent: number;
}

// Discriminated by the parent scheme's `type` — only the sub-object
// matching that type is ever populated/read (see
// grading-scheme.model.ts's computeGradeFromConfig()).
export interface GradingSchemeConfig {
  bands?: PercentageLetterBand[]; // percentage_letter
  gradePoints?: GpaGradePoint[]; // gpa
  passingGradePoints?: number; // gpa
  predictedBands?: CambridgePredictedBand[]; // cambridge (predicted grade only)
  passingPercent?: number; // pass_fail
}

export interface GradingScheme {
  id: string;
  name: string;
  type: GradingSchemeType;
  isDefault: boolean;
  repeatPolicy: RepeatPolicy;
  config: GradingSchemeConfig;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateGradingSchemeBody {
  name: string;
  type: GradingSchemeType;
  isDefault?: boolean;
  repeatPolicy?: RepeatPolicy;
  config?: GradingSchemeConfig;
}

export interface UpdateGradingSchemeBody {
  name?: string;
  // `type` is deliberately not updatable (see grading-scheme.validator.ts) —
  // changing it in place would reinterpret every past Result graded under
  // it. Create a new scheme and reassign classes instead.
  repeatPolicy?: RepeatPolicy;
  config?: GradingSchemeConfig;
}

export const gradingSchemesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGradingSchemes: builder.query<ApiArray<GradingScheme>, void>({
      query: () => '/grading-schemes',
      providesTags: [{ type: 'Classes', id: 'GRADING_SCHEMES' }],
    }),
    createGradingScheme: builder.mutation<ApiObject<GradingScheme>, CreateGradingSchemeBody>({
      query: (body) => ({ url: '/grading-schemes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Classes', id: 'GRADING_SCHEMES' }],
    }),
    updateGradingScheme: builder.mutation<ApiObject<GradingScheme>, { id: string; body: UpdateGradingSchemeBody }>({
      query: ({ id, body }) => ({ url: `/grading-schemes/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Classes', id: 'GRADING_SCHEMES' }],
    }),
    setDefaultGradingScheme: builder.mutation<ApiObject<GradingScheme>, string>({
      query: (id) => ({ url: `/grading-schemes/${id}/set-default`, method: 'POST' }),
      invalidatesTags: [{ type: 'Classes', id: 'GRADING_SCHEMES' }],
    }),
  }),
});

export const {
  useGetGradingSchemesQuery,
  useCreateGradingSchemeMutation,
  useUpdateGradingSchemeMutation,
  useSetDefaultGradingSchemeMutation,
} = gradingSchemesApi;
