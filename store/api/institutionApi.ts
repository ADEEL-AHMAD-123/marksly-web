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
  // Has the admin explicitly confirmed the current `name` is correct? See
  // lib/institution-name.ts's looksAbbreviated() — used to silence the
  // soft "this looks abbreviated" nudge once dismissed. Not a validation
  // gate, just tracks whether the one-time prompt has been satisfied.
  nameConfirmed: boolean;
  // Card-appearance/validity settings applied to every rendered ID card —
  // see institution.model.ts's Institution.settings.idCard. Optional/null
  // only for the theoretical case of a document created before this field
  // existed; the schema-level defaults mean it's always populated in
  // practice.
  settings?: { idCard?: IdCardSettings };
}

export interface UpdateInstitutionProfileBody {
  name?: string;
  address?: string;
  city?: string;
  province?: string;
  contactEmail?: string;
  contactPhone?: string;
  academicStructure?: 'yearly' | 'semester' | 'short_session' | 'custom';
  // One-shot: send `true` when the admin dismisses the abbreviation warning
  // via "Yes, this is correct" without changing `name`.
  confirmName?: true;
  // Partial update of Institution.settings.idCard — see
  // institution.validator.ts's idCardSettingsSchema. Only sent fields
  // change; anything omitted is left untouched server-side.
  idCard?: UpdateIdCardSettingsBody;
}

// Mirrors backend institution.model.ts's Institution.settings.idCard shape
// exactly. customLogoUrl/customLogoPublicId are read-only here — they're
// only ever set via uploadInstitutionIdCardLogo/removeInstitutionIdCardLogo
// below, never via updateMyInstitution.
export interface IdCardSettings {
  showNationalId: boolean;
  showBloodGroup: boolean;
  studentValidityMonths: number;
  staffValidityMonths: number;
  customLogoUrl?: string;
  customLogoPublicId?: string;
  showInstituteName: boolean;
}

export interface UpdateIdCardSettingsBody {
  showNationalId?: boolean;
  showBloodGroup?: boolean;
  studentValidityMonths?: number;
  staffValidityMonths?: number;
  showInstituteName?: boolean;
}

// Trimmed, non-sensitive snapshot returned by GET /institutions/me/overview
// — available to teacher/staff/accountant (not just admin), for dashboard
// widgets that want a sense of the institution without the full profile.
export interface InstitutionOverview {
  name: string;
  type: string;
  logoUrl: string | null;
  teacherCount: number;
  studentCount: number;
}

export const institutionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyInstitution: builder.query<ApiObject<InstitutionProfile>, void>({
      query: () => '/institutions/me',
      providesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
    getMyInstitutionOverview: builder.query<ApiObject<InstitutionOverview>, void>({
      query: () => '/institutions/me/overview',
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
    // ID-card-specific logo override — same FormData/multipart pattern as
    // uploadInstitutionLogo above, just stored at settings.idCard.customLogoUrl
    // instead of the institution's main logoUrl (see institution.service.ts's
    // uploadIdCardLogo()). Falls back to the main logo everywhere on the
    // card until an override is uploaded.
    uploadInstitutionIdCardLogo: builder.mutation<ApiObject<{ customLogoUrl: string }>, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        return { url: '/institutions/me/id-card-logo', method: 'POST', body: formData };
      },
      invalidatesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
    removeInstitutionIdCardLogo: builder.mutation<ApiObject<{ customLogoUrl: null }>, void>({
      query: () => ({ url: '/institutions/me/id-card-logo', method: 'DELETE' }),
      invalidatesTags: [{ type: 'Institutions', id: 'ME' }],
    }),
  }),
});

export const {
  useGetMyInstitutionQuery,
  useGetMyInstitutionOverviewQuery,
  useUpdateMyInstitutionMutation,
  useUploadInstitutionLogoMutation,
  useRemoveInstitutionLogoMutation,
  useUploadInstitutionIdCardLogoMutation,
  useRemoveInstitutionIdCardLogoMutation,
} = institutionApi;
