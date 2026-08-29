import { baseApi } from './baseApi';

// Mirrors backend src/modules/academic/term.model.ts / term.validator.ts /
// term.service.ts (mapTerm()) exactly — do not add fields the backend
// doesn't send, and don't rename any of these.
export type TermType = 'academic_year' | 'semester' | 'trimester' | 'short_session' | 'custom';
export type TermStatus = 'upcoming' | 'active' | 'closed';

export interface Term {
  id: string;
  name: string;
  type: TermType;
  startDate: string | null;
  endDate: string | null;
  status: TermStatus;
  parentAcademicYearId: string | null;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateTermBody {
  name: string;
  // Optional — term.service.ts defaults it from the institution's
  // academicStructure setting when omitted.
  type?: TermType;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: TermStatus;
  parentAcademicYearId?: string;
}

export interface UpdateTermBody {
  name?: string;
  // Only settable while the term is unlocked (backend throws TERM_LOCKED
  // otherwise — see term.model.ts's assertTermTypeUnchanged()).
  type?: TermType;
  startDate?: string;
  endDate?: string;
  status?: TermStatus;
  parentAcademicYearId?: string | null;
}

// ─── Promotion ────────────────────────────────────────────────────────────
// Matches term.validator.ts's promoteSchema (PromoteDto) exactly.

export interface Leaver {
  studentId: string;
  status: 'transferred' | 'withdrawn' | 'expelled';
  reason?: string;
}

export interface PromoteBody {
  // The term students are being promoted INTO — required explicitly now
  // that an institution can have several active terms at once.
  termId: string;
  items: {
    fromClassId: string;
    fromSectionId: string;
    toClassId: string;
    toSectionId: string;
    excludeStudentIds?: string[];
  }[];
  graduateClassIds?: string[];
  leavers?: Leaver[];
}

interface StudentWithBalance { id: string; name: string; rollNumber: string; balance: number }
interface NamedStudent { id: string; name: string; rollNumber: string }

export interface PromotionPreviewItem {
  fromClassId: string;
  fromSectionId: string;
  toClassId: string;
  toSectionId: string;
  fromClassName: string;
  toClassName: string;
  type: 'promoted' | 'repeated';
  studentCount: number;
  studentsWithOutstandingBalance: StudentWithBalance[];
  heldBackCount: number;
  heldBackStudents: NamedStudent[];
  willCloneSubjects: boolean;
  noSubjectsWarning: boolean;
}

export interface PromotionPreviewLeaver {
  studentId: string;
  name: string;
  rollNumber: string;
  status: string;
  reason?: string;
  valid: boolean;
  issue?: string;
  balance?: number;
}

export interface PromotionPreview {
  items: PromotionPreviewItem[];
  graduate: { studentCount: number; studentsWithOutstandingBalance: StudentWithBalance[] } | null;
  leavers: PromotionPreviewLeaver[];
  // Non-blocking heads-up when the target term isn't type 'academic_year'
  // (grade-level promotion is a school/college concept — see
  // term.service.ts's previewPromotion()).
  structuralWarning: string | null;
}

export const termsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTerms: builder.query<ApiArray<Term>, void>({
      query: () => '/terms',
      providesTags: [{ type: 'Classes', id: 'TERMS' }],
    }),
    // Backend does expose GET /terms/active (term.routes.ts) returning
    // every currently-active term — unlike the old single "active year",
    // there can be more than one.
    getActiveTerms: builder.query<ApiArray<Term>, void>({
      query: () => '/terms/active',
      providesTags: [{ type: 'Classes', id: 'ACTIVE_TERMS' }],
    }),
    createTerm: builder.mutation<ApiObject<{ id: string }>, CreateTermBody>({
      query: (body) => ({ url: '/terms', method: 'POST', body }),
      invalidatesTags: [{ type: 'Classes', id: 'TERMS' }, { type: 'Classes', id: 'ACTIVE_TERMS' }],
    }),
    updateTerm: builder.mutation<ApiObject<Term>, { id: string; body: UpdateTermBody }>({
      query: ({ id, body }) => ({ url: `/terms/${id}`, method: 'PATCH', body }),
      invalidatesTags: [
        { type: 'Classes', id: 'TERMS' },
        { type: 'Classes', id: 'ACTIVE_TERMS' },
        { type: 'Classes', id: 'LIST' },
      ],
    }),
    previewPromotion: builder.mutation<ApiObject<PromotionPreview>, PromoteBody>({
      query: (body) => ({ url: '/terms/promote/preview', method: 'POST', body }),
    }),
    promoteStudents: builder.mutation<ApiObject<{ batchId: string; moved: number; graduated: number; left: number }>, PromoteBody>({
      query: (body) => ({ url: '/terms/promote', method: 'POST', body }),
      // Bare 'Students' too — a promoted/graduated student's class changes
      // here, and portalApi's myChildren (parent portal) provides the bare
      // tag, not a specific id, so it would otherwise show a stale class.
      invalidatesTags: [{ type: 'Students', id: 'LIST' }, { type: 'Students', id: 'STATS' }, 'Students'],
    }),
    undoPromotion: builder.mutation<ApiObject<{ reverted: number; skipped: number; overLimit: number }>, string>({
      query: (batchId) => ({ url: `/terms/promote/${batchId}/undo`, method: 'POST' }),
      invalidatesTags: [{ type: 'Students', id: 'LIST' }, { type: 'Students', id: 'STATS' }, 'Students'],
    }),
  }),
});

export const {
  useGetTermsQuery,
  useGetActiveTermsQuery,
  useCreateTermMutation,
  useUpdateTermMutation,
  usePreviewPromotionMutation,
  usePromoteStudentsMutation,
  useUndoPromotionMutation,
} = termsApi;
