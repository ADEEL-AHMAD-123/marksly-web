import { baseApi } from './baseApi';
import type { CumulativeGpaResult, TermGpaResult } from './studentsApi';

export type { CumulativeGpaResult, TermGpaResult };

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  note?: string;
  subject?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface AttendanceData {
  rate: number;
  total: number;
  records: AttendanceRecord[];
  // Echoes back the termId the rate was scoped to (null when unscoped —
  // the default "last 30/60 records" view).
  termId?: string | null;
}

export interface ResultItem {
  examTitle: string;
  type: string;
  totalObtained: number;
  totalMarks: number;
  percentage: number;
  // Under a cambridge scheme this is the PREDICTED grade only — see
  // officialGrade below for the real result.
  grade: string;
  gradePoints?: number | null;
  officialGrade?: string | null;
  // 'pending' = withheld (e.g. Cambridge official grade not in yet) — must
  // not be presented to the student/parent as a final result.
  status?: 'final' | 'pending' | null;
  isPassed: boolean;
  marks: { name: string; obtained: number; total: number }[];
}

export interface FeeItem {
  id: string;
  structureName: string | null;
  dueDate: string;
  netAmount: number;
  paid: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
}

export interface ChildSummary {
  id: string;
  name: string;
  rollNumber: string;
  className: string | null;
  attendanceRate: number;
  feesDue: number;
}

export interface TeacherClass {
  id: string;
  name: string;
  termId: string | null;
  termName: string | null;
  sections: { id: string; name: string; students: number }[];
}

export interface CoreSubject {
  id: string;
  name: string;
  code: string | null;
  teacherName: string | null;
}
export interface ElectiveSubject extends CoreSubject {
  status: 'none' | 'pending' | 'enrolled' | 'rejected' | 'dropped';
}
export interface StudentSubjects {
  core: CoreSubject[];
  electives: ElectiveSubject[];
}

interface ApiObject<T> { success: boolean; data: T; message: string }

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => !!v) as [string, string][];
  return parts.length ? `?${parts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
}

export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Student
    // (bare/id-less tags below act as wildcard subscriptions — they refetch
    // whenever ANY admin/teacher mutation invalidates that tag type, e.g. a
    // teacher marking attendance or saving results. These previously had no
    // tags at all, so a student's own portal never refreshed on its own.)
    myAttendance: builder.query<ApiObject<AttendanceData>, { termId?: string } | void>({
      query: (params) => `/me/student/attendance${qs({ termId: params?.termId })}`,
      providesTags: ['Attendance'],
    }),
    myResults: builder.query<ApiObject<ResultItem[]>, void>({
      query: () => '/me/student/results',
      providesTags: ['Results'],
    }),
    // Matches backend gpa.service.ts's CumulativeGpaResult/TermGpaResult
    // shapes exactly (same as studentsApi's admin-facing equivalents) —
    // null cgpa/gpa means "not applicable" (no gpa-scheme courses), not an
    // error or zero.
    myCgpa: builder.query<ApiObject<CumulativeGpaResult>, void>({
      query: () => '/me/student/cgpa',
      providesTags: [{ type: 'Students', id: 'CGPA-MINE' }],
    }),
    myTermGpa: builder.query<ApiObject<TermGpaResult>, string>({
      query: (termId) => `/me/student/term-gpa/${termId}`,
      providesTags: (_r, _e, termId) => [{ type: 'Students', id: `TERMGPA-MINE-${termId}` }],
    }),
    myFees: builder.query<ApiObject<FeeItem[]>, void>({
      query: () => '/me/student/fees',
      providesTags: [{ type: 'Fees', id: 'MINE' }],
    }),
    mySubjects: builder.query<ApiObject<StudentSubjects>, void>({
      query: () => '/me/student/subjects',
      providesTags: [{ type: 'Subjects', id: 'MINE' }],
    }),
    joinSubject: builder.mutation<ApiObject<unknown>, string>({
      query: (id) => ({ url: `/me/student/subjects/${id}/join`, method: 'POST' }),
      invalidatesTags: [{ type: 'Subjects', id: 'MINE' }],
    }),
    leaveSubject: builder.mutation<ApiObject<unknown>, string>({
      query: (id) => ({ url: `/me/student/subjects/${id}/leave`, method: 'POST' }),
      invalidatesTags: [{ type: 'Subjects', id: 'MINE' }],
    }),
    // Parent
    myChildren: builder.query<ApiObject<ChildSummary[]>, void>({
      query: () => '/me/children',
      providesTags: ['Students', 'Attendance', 'Fees'],
    }),
    childAttendance: builder.query<ApiObject<AttendanceData>, { id: string; termId?: string }>({
      query: ({ id, termId }) => `/me/children/${id}/attendance${qs({ termId })}`,
      providesTags: ['Attendance'],
    }),
    childResults: builder.query<ApiObject<ResultItem[]>, string>({
      query: (id) => `/me/children/${id}/results`,
      providesTags: ['Results'],
    }),
    childCgpa: builder.query<ApiObject<CumulativeGpaResult>, string>({
      query: (id) => `/me/children/${id}/cgpa`,
      providesTags: (_r, _e, id) => [{ type: 'Students', id: `CGPA-${id}` }],
    }),
    childTermGpa: builder.query<ApiObject<TermGpaResult>, { childId: string; termId: string }>({
      query: ({ childId, termId }) => `/me/children/${childId}/term-gpa/${termId}`,
      providesTags: (_r, _e, { childId, termId }) => [{ type: 'Students', id: `TERMGPA-${childId}-${termId}` }],
    }),
    childFees: builder.query<ApiObject<FeeItem[]>, string>({
      query: (id) => `/me/children/${id}/fees`,
      providesTags: ['Fees'],
    }),
    // Teacher
    myClasses: builder.query<ApiObject<TeacherClass[]>, void>({
      query: () => '/me/teacher/classes',
      providesTags: ['Classes'],
    }),
  }),
});

export const {
  useMyAttendanceQuery,
  useMyResultsQuery,
  useMyCgpaQuery,
  useMyTermGpaQuery,
  useMyFeesQuery,
  useMySubjectsQuery,
  useJoinSubjectMutation,
  useLeaveSubjectMutation,
  useMyChildrenQuery,
  useChildAttendanceQuery,
  useChildResultsQuery,
  useChildCgpaQuery,
  useChildTermGpaQuery,
  useChildFeesQuery,
  useMyClassesQuery,
} = portalApi;
