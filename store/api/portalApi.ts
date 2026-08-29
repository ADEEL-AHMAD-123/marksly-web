import { baseApi } from './baseApi';

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
  academicYear: string;
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

export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Student
    // (bare/id-less tags below act as wildcard subscriptions — they refetch
    // whenever ANY admin/teacher mutation invalidates that tag type, e.g. a
    // teacher marking attendance or saving results. These previously had no
    // tags at all, so a student's own portal never refreshed on its own.)
    myAttendance: builder.query<ApiObject<AttendanceData>, void>({
      query: () => '/me/student/attendance',
      providesTags: ['Attendance'],
    }),
    myResults: builder.query<ApiObject<ResultItem[]>, void>({
      query: () => '/me/student/results',
      providesTags: ['Results'],
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
    childAttendance: builder.query<ApiObject<AttendanceData>, string>({
      query: (id) => `/me/children/${id}/attendance`,
      providesTags: ['Attendance'],
    }),
    childResults: builder.query<ApiObject<ResultItem[]>, string>({
      query: (id) => `/me/children/${id}/results`,
      providesTags: ['Results'],
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
  useMyFeesQuery,
  useMySubjectsQuery,
  useJoinSubjectMutation,
  useLeaveSubjectMutation,
  useMyChildrenQuery,
  useChildAttendanceQuery,
  useChildResultsQuery,
  useChildFeesQuery,
  useMyClassesQuery,
} = portalApi;
