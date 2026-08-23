import { baseApi } from './baseApi';

export interface StudentListItem {
  id: string;
  rollNumber: string;
  admissionNumber: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profilePhoto: string | null;
  className: string | null;
  section: string | null;
  gender: 'male' | 'female' | 'other';
  status: 'active' | 'inactive' | 'graduated' | 'expelled' | 'transferred';
  admissionDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
}

export interface StudentStats {
  total: number;
  active: number;
  inactive: number;
  male: number;
  female: number;
  newThisMonth: number;
  planLimit: number | null;
  overLimitBy: number;
}

export interface ListStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  status?: StudentListItem['status'];
  sortBy?: 'createdAt' | 'rollNumber' | 'admissionDate';
  sortOrder?: 'asc' | 'desc';
}

interface ApiList<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiObject<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateStudentBody {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password?: string;
  rollNumber: string;
  admissionNumber: string;
  classId: string;
  sectionId: string;
  gender: 'male' | 'female' | 'other';
  admissionDate?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  previousSchool?: string;
  guardianIds?: string[];
  parentPhone?: string;
  parentName?: string;
}

export interface BulkImportResult {
  created: number;
  total: number;
  failed: number;
  results: { row: number; status: 'created' | 'error'; name?: string; message?: string }[];
}

export interface IdCard {
  id: string;
  name: string;
  rollNumber: string;
  admissionNumber: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string | null;
  profilePhoto: string | null;
  qr: string;
}

export interface IdCardSheet {
  institution: { name: string; city: string | null };
  className: string | null;
  section: string | null;
  students: IdCard[];
}

export const studentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query<ApiList<StudentListItem>, ListStudentsParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
        });
        const qs = search.toString();
        return `/students${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((s) => ({ type: 'Students' as const, id: s.id })),
              { type: 'Students' as const, id: 'LIST' },
            ]
          : [{ type: 'Students' as const, id: 'LIST' }],
    }),

    getStudentStats: builder.query<ApiObject<StudentStats>, void>({
      query: () => '/students/stats',
      providesTags: [{ type: 'Students', id: 'STATS' }],
    }),

    getStudent: builder.query<ApiObject<StudentListItem>, string>({
      query: (id) => `/students/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Students', id }],
    }),

    // Every mutation below also invalidates the bare 'Students' tag (in
    // addition to the specific LIST/STATS/id ones) because portalApi's
    // myChildren and reportsApi's getReports both provide the bare tag —
    // RTK Query only matches invalidation by exact {type, id}, so without
    // this a parent's children list (e.g. right after their new child is
    // created here with a linked guardian phone) or the admin reports page
    // would never refresh. See the same fix applied to attendanceApi,
    // feesApi and examsApi.
    createStudent: builder.mutation<ApiObject<StudentListItem>, CreateStudentBody>({
      query: (body) => ({ url: '/students', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
      ],
    }),

    updateStudent: builder.mutation<
      ApiObject<StudentListItem>,
      { id: string; body: Partial<CreateStudentBody> & { status?: StudentListItem['status'] } }
    >({
      query: ({ id, body }) => ({ url: `/students/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Students', id },
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
      ],
    }),

    deleteStudent: builder.mutation<ApiObject<{ id: string; status: string }>, string>({
      query: (id) => ({ url: `/students/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
      ],
    }),

    bulkImportStudents: builder.mutation<ApiObject<BulkImportResult>, { csv: string }>({
      query: (body) => ({ url: '/students/bulk', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
      ],
    }),

    getIdCards: builder.query<ApiObject<IdCardSheet>, { classId: string; sectionId: string }>({
      query: ({ classId, sectionId }) => `/students/cards?classId=${classId}&sectionId=${sectionId}`,
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useGetStudentStatsQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useBulkImportStudentsMutation,
  useGetIdCardsQuery,
} = studentsApi;
