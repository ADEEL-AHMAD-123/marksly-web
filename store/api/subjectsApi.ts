import { baseApi } from './baseApi';

export interface SubjectSectionTeacher {
  sectionId: string;
  sectionName: string | null;
  teacherId: string;
  teacherName: string | null;
}

export interface SubjectSectionCoverage {
  sectionId: string;
  sectionName: string | null;
  // null when NEITHER a section override NOR the fallback teacherId covers
  // this section — a genuine "nobody teaches this" gap.
  teacherId: string | null;
  teacherName: string | null;
  isOverride: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  className: string | null;
  classId: string | null;
  // Fallback teacher — used for sections with no entry in sectionTeachers,
  // and for subjects with no classId (available to all classes).
  teacherName: string | null;
  teacherId: string | null;
  // Raw per-section overrides only — used to prefill the edit form (which
  // section explicitly deviates from the fallback teacher).
  sectionTeachers: SubjectSectionTeacher[];
  // Every section in the class resolved to its effective teacher (override
  // or fallback) — use this for display/coverage checks. Empty when the
  // class has 0 or 1 sections (nothing to disambiguate).
  sectionCoverage: SubjectSectionCoverage[];
  isElective: boolean;
  isActive: boolean;
  enrolledCount: number;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface SectionTeacherInput {
  sectionId: string;
  teacherId: string;
}

export interface CreateSubjectBody {
  name: string;
  code?: string;
  classId?: string;
  teacherId?: string;
  sectionTeachers?: SectionTeacherInput[];
  isElective?: boolean;
}

export interface UpdateSubjectBody extends Partial<CreateSubjectBody> {
  isActive?: boolean;
}

export interface EnrollmentRequest {
  id: string;
  studentName: string;
  rollNumber: string | null;
  subjectName: string | null;
  status: string;
  requestedAt: string;
}

export const subjectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<ApiArray<Subject>, void>({
      query: () => '/subjects',
      providesTags: [{ type: 'Subjects', id: 'LIST' }],
    }),
    // Also invalidate {Subjects, 'MINE'} — a new/removed subject tied to a
    // student's class changes what shows up in their own core/elective list
    // (portalApi's mySubjects), not just the admin's subject list.
    createSubject: builder.mutation<ApiObject<{ id: string }>, CreateSubjectBody>({
      query: (body) => ({ url: '/subjects', method: 'POST', body }),
      invalidatesTags: [{ type: 'Subjects', id: 'LIST' }, { type: 'Subjects', id: 'MINE' }],
    }),
    updateSubject: builder.mutation<
      ApiObject<{
        id: string;
        updatedTimetableEntries: number;
        affectedSections: { sectionId: string; sectionName: string; count: number }[];
      }>,
      { id: string; body: UpdateSubjectBody }
    >({
      query: ({ id, body }) => ({ url: `/subjects/${id}`, method: 'PATCH', body }),
      // A subject update can change who teaches a section, which the backend
      // then bulk-resyncs onto existing TimetableEntry docs (see
      // subject.service.ts). Without invalidating the timetable tag too, a
      // teacher who already has their dashboard/timetable open wouldn't see
      // the corrected schedule until some unrelated navigation refetched it.
      invalidatesTags: [
        { type: 'Subjects', id: 'LIST' },
        { type: 'Subjects', id: 'MINE' },
        { type: 'Classes', id: 'TIMETABLE' },
        // portalApi.ts's myClasses (teacher "My Classes") provides a bare
        // 'Classes' tag (no id) — RTK Query treats that as a distinct cache
        // entry from {Classes, id:'TIMETABLE'}, so both must be listed or a
        // teacher's already-open "My Classes" view won't refresh live when
        // their subject/section assignment changes.
        'Classes',
      ],
    }),
    deleteSubject: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/subjects/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Subjects', id: 'LIST' }, { type: 'Subjects', id: 'MINE' }],
    }),
    getEnrollmentRequests: builder.query<ApiArray<EnrollmentRequest>, { status?: string } | void>({
      query: (params) => `/subjects/enrollments${params?.status ? `?status=${params.status}` : ''}`,
      providesTags: [{ type: 'Subjects', id: 'ENROLLMENTS' }],
    }),
    // Also invalidate {Subjects, 'MINE'} — that's the exact tag
    // portalApi's mySubjects provides for the student who filed this
    // request. Without it, approving/rejecting an elective here wouldn't
    // update in the requesting student's own portal until they reloaded.
    approveEnrollment: builder.mutation<ApiObject<unknown>, string>({
      query: (id) => ({ url: `/subjects/enrollments/${id}/approve`, method: 'POST' }),
      invalidatesTags: [{ type: 'Subjects', id: 'ENROLLMENTS' }, { type: 'Subjects', id: 'MINE' }],
    }),
    rejectEnrollment: builder.mutation<ApiObject<unknown>, string>({
      query: (id) => ({ url: `/subjects/enrollments/${id}/reject`, method: 'POST' }),
      invalidatesTags: [{ type: 'Subjects', id: 'ENROLLMENTS' }, { type: 'Subjects', id: 'MINE' }],
    }),
  }),
});

export const {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetEnrollmentRequestsQuery,
  useApproveEnrollmentMutation,
  useRejectEnrollmentMutation,
} = subjectsApi;
