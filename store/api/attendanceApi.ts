import { baseApi } from './baseApi';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface RosterStudent {
  studentId: string;
  name: string;
  rollNumber: string;
  status: AttendanceStatus;
  note: string;
}

export interface RosterResponse {
  date: string;
  periodId: string;
  classId: string;
  sectionId: string;
  subject: string | null;
  startTime: string;
  endTime: string;
  alreadyMarked: boolean;
  submittedAt: string | null;
  total: number;
  students: RosterStudent[];
}

export interface AttendanceSummary {
  date: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  presentRate: number;
}

interface ApiObject<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface AttendanceCoverageSection {
  sectionId: string;
  sectionName: string;
  studentsCount: number;
  marked: boolean;
  periodsMarked: number;
  periodsScheduled: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export interface AttendanceCoverageClass {
  classId: string;
  className: string;
  sections: AttendanceCoverageSection[];
}

export interface AttendanceCoverage {
  date: string;
  totalClasses: number;
  totalSections: number;
  markedSections: number;
  unmarkedSections: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  presentRate: number;
  classes: AttendanceCoverageClass[];
}

export interface MyPeriod {
  periodId: string;
  classId: string | null;
  className: string | null;
  sectionId: string | null;
  sectionName: string | null;
  subjectId: string | null;
  subject: string | null;
  startTime: string;
  endTime: string;
  marked: boolean;
  submittedAt: string | null;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export interface AttendanceReportRow {
  date: string;
  startTime: string | null;
  endTime: string | null;
  subject: string | null;
  className: string | null;
  sectionName: string | null;
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: AttendanceStatus;
  note: string;
  guardians: { name: string; phone: string | null }[];
}

export interface AttendanceReport {
  total: number;
  rows: AttendanceReportRow[];
}

export interface AttendanceReportParams {
  dateFrom?: string;
  dateTo?: string;
  classId?: string;
  sectionId?: string;
  status?: AttendanceStatus;
}

export interface MarkBody {
  periodId: string;
  date: string;
  records: { studentId: string; status: AttendanceStatus; note?: string }[];
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => !!v) as [string, string][];
  return parts.length ? `?${parts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
}

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // This is built directly from the teacher's timetable (see
    // attendance.service.ts's myPeriodsToday), so it also needs the
    // 'Classes'/'TIMETABLE' tag — otherwise an admin adding/removing a
    // period wouldn't refresh the teacher's own period picker for marking
    // attendance until they reloaded the page.
    getMyPeriods: builder.query<ApiObject<MyPeriod[]>, { date?: string } | void>({
      query: (params) => `/attendance/my-periods${qs({ date: params?.date })}`,
      providesTags: [{ type: 'Attendance', id: 'PERIODS' }, { type: 'Classes', id: 'TIMETABLE' }],
    }),

    getRoster: builder.query<ApiObject<RosterResponse>, { periodId: string; date: string }>({
      query: ({ periodId, date }) => `/attendance${qs({ periodId, date })}`,
      providesTags: [{ type: 'Attendance', id: 'ROSTER' }],
    }),

    getAttendanceSummary: builder.query<ApiObject<AttendanceSummary>, { date?: string } | void>({
      query: (params) => `/attendance/summary${qs({ date: params?.date })}`,
      providesTags: [{ type: 'Attendance', id: 'SUMMARY' }],
    }),

    getAttendanceCoverageToday: builder.query<ApiObject<AttendanceCoverage>, { date?: string } | void>({
      query: (params) => `/attendance/coverage-today${qs({ date: params?.date })}`,
      providesTags: [{ type: 'Attendance', id: 'COVERAGE' }],
    }),

    getAttendanceReport: builder.query<ApiObject<AttendanceReport>, AttendanceReportParams | void>({
      query: (params) =>
        `/attendance/report${qs({
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          classId: params?.classId,
          sectionId: params?.sectionId,
          status: params?.status,
        })}`,
      providesTags: [{ type: 'Attendance', id: 'REPORT' }],
    }),

    markAttendance: builder.mutation<ApiObject<unknown>, MarkBody>({
      query: (body) => ({ url: '/attendance', method: 'POST', body }),
      // RTK Query tag matching is exact: invalidating `{type, id: 'ROSTER'}`
      // only refetches queries that provided that exact `{type, id}` pair —
      // it does NOT also match queries that provide the bare `'Attendance'`
      // tag (no id). portalApi's myAttendance/childAttendance/myChildren
      // (student & parent portals) all provide the bare tag, so without
      // also invalidating it here, a parent's already-open attendance view
      // would never refresh after a teacher marks attendance — a real gap,
      // not just belt-and-suspenders.
      invalidatesTags: [
        { type: 'Attendance', id: 'ROSTER' },
        { type: 'Attendance', id: 'SUMMARY' },
        { type: 'Attendance', id: 'COVERAGE' },
        { type: 'Attendance', id: 'PERIODS' },
        { type: 'Attendance', id: 'REPORT' },
        'Attendance',
      ],
    }),
  }),
});

export const {
  useGetMyPeriodsQuery,
  useGetRosterQuery,
  useGetAttendanceSummaryQuery,
  useGetAttendanceCoverageTodayQuery,
  useGetAttendanceReportQuery,
  useMarkAttendanceMutation,
} = attendanceApi;
