import { baseApi } from './baseApi';

export interface Holiday {
  id: string;
  date: string;
  reason: string;
  scope: 'institution' | 'class';
  classId: string | null;
  className: string | null;
  sectionId: string | null;
  section: string | null;
  audience: 'everyone' | 'students' | 'staff';
  createdAt: string;
}

interface ApiArray<T> { success: boolean; data: T[]; message: string }
interface ApiObject<T> { success: boolean; data: T; message: string }

export interface CreateHolidayBody {
  date: string;
  reason: string;
  scope: 'institution' | 'class';
  classId?: string;
  sectionId?: string;
  audience: 'everyone' | 'students' | 'staff';
}

export const holidaysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Scoped to the Timetable page's current class+section — the backend
    // returns institution-wide holidays plus this exact class+section's
    // own, which is exactly what actually affects the timetable being
    // viewed (never some other class's holiday).
    getHolidays: builder.query<ApiArray<Holiday>, { classId?: string; sectionId?: string }>({
      query: ({ classId, sectionId }) => {
        const params = new URLSearchParams();
        if (classId) params.set('classId', classId);
        if (sectionId) params.set('sectionId', sectionId);
        const qs = params.toString();
        return `/holidays${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Holidays', id: 'LIST' }],
    }),
    createHoliday: builder.mutation<ApiObject<Holiday>, CreateHolidayBody>({
      query: (body) => ({ url: '/holidays', method: 'POST', body }),
      invalidatesTags: [{ type: 'Holidays', id: 'LIST' }],
    }),
    deleteHoliday: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Holidays', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
} = holidaysApi;
