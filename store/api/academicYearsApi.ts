import { baseApi } from './baseApi';

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isClosed: boolean;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface Leaver {
  studentId: string;
  status: 'transferred' | 'withdrawn' | 'expelled';
  reason?: string;
}

export interface PromoteBody {
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
}

export const academicYearsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAcademicYears: builder.query<ApiArray<AcademicYear>, void>({
      query: () => '/academic-years',
      providesTags: [{ type: 'Classes', id: 'YEARS' }],
    }),
    getActiveYear: builder.query<ApiObject<AcademicYear>, void>({
      query: () => '/academic-years/active',
      providesTags: [{ type: 'Classes', id: 'ACTIVE_YEAR' }],
    }),
    createAcademicYear: builder.mutation<ApiObject<{ id: string }>, { name: string; startDate?: string; endDate?: string; activate?: boolean }>({
      query: (body) => ({ url: '/academic-years', method: 'POST', body }),
      invalidatesTags: [{ type: 'Classes', id: 'YEARS' }, { type: 'Classes', id: 'ACTIVE_YEAR' }],
    }),
    activateAcademicYear: builder.mutation<ApiObject<unknown>, string>({
      query: (id) => ({ url: `/academic-years/${id}/activate`, method: 'POST' }),
      invalidatesTags: [
        { type: 'Classes', id: 'YEARS' },
        { type: 'Classes', id: 'ACTIVE_YEAR' },
        { type: 'Classes', id: 'LIST' },
      ],
    }),
    previewPromotion: builder.mutation<ApiObject<PromotionPreview>, PromoteBody>({
      query: (body) => ({ url: '/academic-years/promote/preview', method: 'POST', body }),
    }),
    promoteStudents: builder.mutation<ApiObject<{ batchId: string; moved: number; graduated: number; left: number }>, PromoteBody>({
      query: (body) => ({ url: '/academic-years/promote', method: 'POST', body }),
      // Bare 'Students' too — a promoted/graduated student's class changes
      // here, and portalApi's myChildren (parent portal) provides the bare
      // tag, not a specific id, so it would otherwise show a stale class.
      invalidatesTags: [{ type: 'Students', id: 'LIST' }, { type: 'Students', id: 'STATS' }, 'Students'],
    }),
    undoPromotion: builder.mutation<ApiObject<{ reverted: number; skipped: number; overLimit: number }>, string>({
      query: (batchId) => ({ url: `/academic-years/promote/${batchId}/undo`, method: 'POST' }),
      invalidatesTags: [{ type: 'Students', id: 'LIST' }, { type: 'Students', id: 'STATS' }, 'Students'],
    }),
  }),
});

export const {
  useGetAcademicYearsQuery,
  useGetActiveYearQuery,
  useCreateAcademicYearMutation,
  useActivateAcademicYearMutation,
  usePreviewPromotionMutation,
  usePromoteStudentsMutation,
  useUndoPromotionMutation,
} = academicYearsApi;
