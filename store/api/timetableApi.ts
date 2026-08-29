import { baseApi } from './baseApi';

export interface TimetableEntry {
  id: string;
  classId: string | null;
  className: string | null;
  sectionId: string | null;
  section: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  subject: string | null;
  teacherId: string | null;
  teacher: string | null;
  room: string | null;
  termId: string | null;
  termName: string | null;
}

export interface TeachNow {
  now: string;
  dayOfWeek: number;
  current: TimetableEntry | null;
  next: TimetableEntry | null;
  today: TimetableEntry[];
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateEntryBody {
  classId: string;
  sectionId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId?: string;
  teacherId?: string;
  room?: string;
}

export const timetableApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTimetable: builder.query<ApiArray<TimetableEntry>, { classId: string; sectionId: string }>({
      query: ({ classId, sectionId }) => `/timetable?classId=${classId}&sectionId=${sectionId}`,
      providesTags: [{ type: 'Classes', id: 'TIMETABLE' }],
    }),
    createEntry: builder.mutation<ApiObject<TimetableEntry>, CreateEntryBody>({
      query: (body) => ({ url: '/timetable', method: 'POST', body }),
      invalidatesTags: [{ type: 'Classes', id: 'TIMETABLE' }],
    }),
    deleteEntry: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/timetable/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Classes', id: 'TIMETABLE' }],
    }),
    // Teacher / student self-service — these previously had no
    // providesTags at all, so an admin editing the timetable (createEntry/
    // deleteEntry, which invalidate {Classes, 'TIMETABLE'}) never refreshed
    // a teacher's "Teaching now" card or a student's own timetable; they'd
    // only update on the next full page reload. Tagging them the same as
    // getTimetable fixes that.
    myTeacherTimetable: builder.query<ApiArray<TimetableEntry>, void>({
      query: () => '/me/teacher/timetable',
      providesTags: [{ type: 'Classes', id: 'TIMETABLE' }],
    }),
    teachNow: builder.query<ApiObject<TeachNow>, void>({
      query: () => '/me/teacher/now',
      providesTags: [{ type: 'Classes', id: 'TIMETABLE' }],
    }),
    myStudentTimetable: builder.query<ApiArray<TimetableEntry>, void>({
      query: () => '/me/student/timetable',
      providesTags: [{ type: 'Classes', id: 'TIMETABLE' }],
    }),
  }),
});

export const {
  useGetTimetableQuery,
  useCreateEntryMutation,
  useDeleteEntryMutation,
  useMyTeacherTimetableQuery,
  useTeachNowQuery,
  useMyStudentTimetableQuery,
} = timetableApi;
