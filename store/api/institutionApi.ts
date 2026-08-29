import { baseApi } from './baseApi';

interface ApiObject<T> { success: boolean; data: T; message: string }

export interface InstitutionProfile {
  name: string;
  slug: string;
  type: string;
  address?: string;
  city?: string;
  province?: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  country: string;
  // Drives the terminology system (see lib/terminology.ts) and is now the
  // default source of a new term's `type` when created without one
  // explicit (see backend term.service.ts's defaultTermTypeForInstitution()).
  academicStructure: 'yearly' | 'semester' | 'short_session' | 'custom';
}

export interface UpdateInstitutionProfileBody {
  name?: string;
  address?: string;
  city?: string;
  province?: string;
  contactEmail?: string;
  contactPhone?: string;
  academicStructure?: 'yearly' | 'semester' | 'short_session' | 'custom';
}

export const institutionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyInstitution: builder.query<ApiObject<InstitutionProfile>, void>({
      query: () => '/institutions/me',
      providesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
    updateMyInstitution: builder.mutation<ApiObject<InstitutionProfile>, UpdateInstitutionProfileBody>({
      query: (body) => ({ url: '/institutions/me', method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
    // FormData body — fetchBaseQuery passes it straight through without
    // JSON-encoding and lets the browser set the multipart boundary itself,
    // so no custom baseQuery is needed for this one.
    uploadInstitutionLogo: builder.mutation<ApiObject<{ logoUrl: string }>, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        return { url: '/institutions/me/logo', method: 'POST', body: formData };
      },
      invalidatesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
    removeInstitutionLogo: builder.mutation<ApiObject<{ logoUrl: null }>, void>({
      query: () => ({ url: '/institutions/me/logo', method: 'DELETE' }),
      invalidatesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
  }),
});

export const {
  useGetMyInstitutionQuery,
  useUpdateMyInstitutionMutation,
  useUploadInstitutionLogoMutation,
  useRemoveInstitutionLogoMutation,
} = institutionApi;
