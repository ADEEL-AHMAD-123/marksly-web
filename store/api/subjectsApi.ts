import { baseApi } from './baseApi';

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  className: string | null;
  classId: string | null;
  teacherName: string | null;
  teacherId: string | null;
  isElective: boolean;
  isActive: boolean;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateSubjectBody {
  name: string;
  code?: string;
  classId?: string;
  teacherId?: string;
  isElective?: boolean;
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
  useDeleteSubjectMutation,
  useGetEnrollmentRequestsQuery,
  useApproveEnrollmentMutation,
  useRejectEnrollmentMutation,
} = subjectsApi;
