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

export interface BulkCreateHolidaysResult {
  created: Holiday[];
  skipped: { date: string; reason: string }[];
}

export interface HolidayOverlap {
  exams: { id: string; title: string }[];
  holidays: { reason: string; scope: 'institution' | 'class' }[];
}

export const holidaysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Used both by the Timetable grid (scoped to its current class+section)
    // and the Notices > Holidays manager (institution-wide, no class
    // selected) — the backend returns institution-wide holidays plus this
    // exact class+section's own, which is exactly what actually affects
    // whatever's being viewed (never some other class's holiday).
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
    createHolidaysBulk: builder.mutation<ApiObject<BulkCreateHolidaysResult>, { holidays: CreateHolidayBody[] }>({
      query: (body) => ({ url: '/holidays/bulk', method: 'POST', body }),
      invalidatesTags: [{ type: 'Holidays', id: 'LIST' }],
    }),
    updateHoliday: builder.mutation<ApiObject<Holiday>, { id: string } & CreateHolidayBody>({
      query: ({ id, ...body }) => ({ url: `/holidays/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Holidays', id: 'LIST' }],
    }),
    deleteHoliday: builder.mutation<ApiObject<{ id: string }>, string>({
      query: (id) => ({ url: `/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Holidays', id: 'LIST' }],
    }),
    // Not tied to cache invalidation like the others — this is a
    // point-in-time "would this collide with anything" check the form
    // fires as the admin fills it in, not data the page displays on its
    // own. Lazy so the caller decides exactly when to fire it (on
    // date/scope change), rather than on mount.
    checkHolidayOverlap: builder.query<ApiObject<HolidayOverlap>, { date: string; classId?: string; sectionId?: string }>({
      query: ({ date, classId, sectionId }) => {
        const params = new URLSearchParams({ date });
        if (classId) params.set('classId', classId);
        if (sectionId) params.set('sectionId', sectionId);
        return `/holidays/check-overlap?${params.toString()}`;
      },
    }),
  }),
});

export const {
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useCreateHolidaysBulkMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useLazyCheckHolidayOverlapQuery,
} = holidaysApi;
