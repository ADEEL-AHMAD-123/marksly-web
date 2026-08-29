import { baseApi } from './baseApi';

export interface Section {
  id: string;
  name: string;
  capacity: number | null;
  currentCount: number;
  teacherId: string | null;
  teacherName: string | null;
}

export interface ClassItem {
  id: string;
  name: string;
  level: number;
  // Backend's class.service.ts mapClass() sends both: termId (always a
  // string, populated or not) and termName (only present when the `term`
  // path was populated, which the list() query always does).
  termId: string | null;
  termName: string | null;
  // The class's own assigned grading scheme, if any — null when unset,
  // meaning it falls back to the institution's default scheme (see
  // backend's grading-scheme.service.ts resolveSchemeForClass()).
  gradingSchemeId: string | null;
  isActive: boolean;
  sections: Section[];
}

interface ApiArray<T> {
  success: boolean;
  data: T[];
  message: string;
}

interface ApiObject<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface SectionInput {
  id?: string;
  name: string;
  capacity?: number;
  teacherId?: string;
}

export interface CreateClassBody {
  name: string;
  level: number;
  // Required now — see class.validator.ts's createClassSchema. The caller
  // must explicitly pick which term this class belongs to (no more
  // implicit "the active year").
  termId: string;
  sections: SectionInput[];
  gradingSchemeId?: string;
}

export interface UpdateClassBody {
  name?: string;
  level?: number;
  termId?: string;
  isActive?: boolean;
  gradingSchemeId?: string | null;
  sections?: SectionInput[];
}

export const classesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClasses: builder.query<ApiArray<ClassItem>, { activeOnly?: boolean; all?: boolean; termId?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.activeOnly) search.set('activeOnly', 'true');
        if (params?.all) search.set('all', 'true');
        if (params?.termId) search.set('termId', params.termId);
        const qs = search.toString();
        return `/classes${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Classes', id: 'LIST' }],
    }),

    createClass: builder.mutation<ApiObject<ClassItem>, CreateClassBody>({
      query: (body) => ({ url: '/classes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Classes', id: 'LIST' }],
    }),

    // Bare 'Classes' too — this is exactly where a section's teacherId gets
    // (re)assigned, and portalApi's myClasses (teacher portal) provides the
    // bare tag, not a specific id, so a teacher's own class list wouldn't
    // pick up a new section assignment without it.
    updateClass: builder.mutation<ApiObject<ClassItem>, { id: string; body: UpdateClassBody }>({
      query: ({ id, body }) => ({ url: `/classes/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Classes', id: 'LIST' }, 'Classes'],
    }),
  }),
});

export const { useGetClassesQuery, useCreateClassMutation, useUpdateClassMutation } = classesApi;
