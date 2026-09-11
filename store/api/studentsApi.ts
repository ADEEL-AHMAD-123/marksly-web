import { baseApi } from './baseApi';
import type { IdCardSettings } from './institutionApi';

// Shared shape for the `institution` object embedded in every ID-card
// response (getIdCards, getMyStudentCard) — always includes
// settings.idCard so card-rendering components can apply
// showNationalId/showBloodGroup/showInstituteName/customLogoUrl without a
// separate institution-settings fetch. See student.service.ts's
// cardsForSection()/getMyCard().
export interface IdCardInstitution {
  name: string;
  city: string | null;
  logoUrl: string | null;
  type?: string;
  settings?: { idCard?: IdCardSettings | null };
}

export interface StudentListItem {
  id: string;
  // Only present on getStudent (single-record fetch) — the underlying
  // User document's id, needed to call the user-scoped photo endpoints
  // (POST/DELETE /users/:id/photo). Not returned by the list endpoint.
  userId?: string | null;
  rollNumber: string;
  admissionNumber: string;
  // Login ID for students with no email/phone on file (format MKS-XXXXXXXX)
  // — same value printed on the ID card. Null until the card is generated
  // (backend lazy-generates it on first ID card print), same as IdCard's.
  systemId: string | null;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  profilePhoto: string | null;
  className: string | null;
  section: string | null;
  gender: 'male' | 'female' | 'other';
  status: 'active' | 'inactive' | 'graduated' | 'expelled' | 'transferred' | 'withdrawn';
  leftAt: string | null;
  leftReason: string | null;
  admissionDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  address: string | null;
  city: string | null;
  bloodGroup: string | null;
  // Format NNNNN-NNNNNNN-N (Pakistani CNIC/Form-B numbering scheme) — see
  // marksly-api's national-id.schema.ts. Label ("Form B" vs "CNIC") is
  // derived from institution.type at display time, not stored per-field.
  nationalIdNumber?: string | null;
  cardIssueDate?: string | null;
  cardExpiryDate?: string | null;
}

export interface StudentStats {
  total: number;
  active: number;
  inactive: number;
  male: number;
  female: number;
  newThisMonth: number;
  planLimit: number | null;
  overLimitBy: number;
}

export interface ListStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentListItem['status'];
  sortBy?: 'createdAt' | 'rollNumber' | 'admissionDate';
  sortOrder?: 'asc' | 'desc';
  incomplete?: boolean;
}

interface ApiList<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiObject<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateStudentBody {
  firstName: string;
  lastName: string;
  // Students never have their own email/phone in any flow — the backend
  // requires at least one of parentEmail/parentPhone/guardianIds instead,
  // and always auto-generates a PIN (returned once as `pin` on
  // createStudent's response) paired with the student's systemId as their
  // login identifier.
  rollNumber: string;
  admissionNumber: string;
  classId: string;
  sectionId: string;
  gender: 'male' | 'female' | 'other';
  admissionDate?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  nationalIdNumber?: string;
  previousSchool?: string;
  guardianIds?: string[];
  parentPhone?: string;
  parentName?: string;
  parentEmail?: string;
  // Card-specific fields, admin-only via PATCH /students/:id — see
  // student.validator.ts. Never accepted on the self-service contact-update
  // endpoint (updateMyStudentContact), which silently strips them if sent.
  cardIssueDate?: string;
  cardExpiryDate?: string;
}

export interface BulkImportResult {
  created: number;
  total: number;
  failed: number;
  results: { row: number; status: 'created' | 'error'; name?: string; message?: string }[];
}

// Mirrors backend src/modules/academic/gpa.service.ts exactly.
export interface GpaCourse {
  subjectName: string;
  creditHours: number;
  gradePoints: number;
  examId: string;
  resultId: string;
}

export interface TermGpaResult {
  termId: string;
  gpa: number | null;
  totalCreditHours: number;
  courses: GpaCourse[];
  excludedPendingCount: number;
}

export interface CgpaTermBreakdown {
  termId: string;
  termName: string;
  gpa: number | null;
  creditHours: number;
}

export interface CumulativeGpaResult {
  cgpa: number | null;
  totalCreditHours: number;
  termBreakdown: CgpaTermBreakdown[];
  excludedPendingCount: number;
}

export interface IdCard {
  id: string;
  // The underlying User document's id — needed to call the user-scoped
  // photo endpoints (POST/DELETE /users/:id/photo), since Student's own
  // `id` above is a different id entirely.
  userId: string | null;
  name: string;
  rollNumber: string;
  admissionNumber: string;
  systemId: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  parentName: string | null;
  parentPhone: string | null;
  profilePhoto: string | null;
  qr: string;
  nationalIdNumber?: string | null;
  cardIssueDate?: string | null;
  cardExpiryDate?: string | null;
}

export interface MyStudentContactInfo {
  studentId: string;
  address: string | null;
  city: string | null;
  bloodGroup: string | null;
  missing: string[];
}

export interface MyStudentCard extends IdCard {
  institution: IdCardInstitution;
  className: string | null;
  section: string | null;
  termName: string | null;
  missing: string[];
  photoMissing: boolean;
}

export interface IdCardSheet {
  institution: IdCardInstitution;
  className: string | null;
  section: string | null;
  termName: string | null;
  students: IdCard[];
}

export const studentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query<ApiList<StudentListItem>, ListStudentsParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        const p = params || {};
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
        });
        const qs = search.toString();
        return `/students${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((s) => ({ type: 'Students' as const, id: s.id })),
              { type: 'Students' as const, id: 'LIST' },
            ]
          : [{ type: 'Students' as const, id: 'LIST' }],
    }),

    getStudentStats: builder.query<ApiObject<StudentStats>, void>({
      query: () => '/students/stats',
      providesTags: [{ type: 'Students', id: 'STATS' }],
    }),

    getStudent: builder.query<ApiObject<StudentListItem>, string>({
      query: (id) => `/students/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Students', id }],
    }),

    // Every mutation below also invalidates the bare 'Students' tag (in
    // addition to the specific LIST/STATS/id ones) because portalApi's
    // myChildren and reportsApi's getReports both provide the bare tag —
    // RTK Query only matches invalidation by exact {type, id}, so without
    // this a parent's children list (e.g. right after their new child is
    // created here with a linked guardian phone) or the admin reports page
    // would never refresh. See the same fix applied to attendanceApi,
    // feesApi and examsApi.
    // tempPassword/pin are only ever present in THIS response, and only when
    // the account was auto-generated one (no `password` sent in the
    // request) — never returned from getStudent/list, never persisted
    // anywhere else. `pin` (not tempPassword) is set instead when the
    // student has no email/phone of their own — see student.service.ts's
    // create(), paired with `systemId` as the login identifier.
    createStudent: builder.mutation<ApiObject<StudentListItem & { tempPassword?: string; guardianTempPassword?: string; pin?: string }>, CreateStudentBody>({
      query: (body) => ({ url: '/students', method: 'POST', body }),
      // Creating a student also bumps Section.currentCount on the Class doc
      // (see adjustSectionCount in student.service.ts) — invalidate 'Classes'
      // too, otherwise the class/section student counts shown on the admin
      // Classes page and the teacher's "My Classes" page go stale until a
      // manual refresh.
      invalidatesTags: [
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
        'Classes',
      ],
    }),

    updateStudent: builder.mutation<
      // guardianTempPassword is only present when this edit just linked a
      // BRAND-NEW parent account (no guardian existed before) — same shape
      // as createStudent's response, see student.service.ts's update().
      ApiObject<StudentListItem & { guardianTempPassword?: string }>,
      {
        id: string;
        // `| null` on the three card-detail fields the quick card editor can
        // clear (EditCardDetailsDialog.tsx) — omitting a key from body still
        // means "untouched"; explicitly sending null means "admin cleared
        // this field". See updateStudentSchema's nullable field variants.
        body: Partial<Omit<CreateStudentBody, 'bloodGroup' | 'nationalIdNumber' | 'cardIssueDate' | 'cardExpiryDate'>> & {
          status?: StudentListItem['status'];
          bloodGroup?: string | null;
          nationalIdNumber?: string | null;
          cardIssueDate?: string | null;
          cardExpiryDate?: string | null;
        };
      }
    >({
      query: ({ id, body }) => ({ url: `/students/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Students', id },
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
        'Classes',
      ],
    }),

    deleteStudent: builder.mutation<
      ApiObject<{ id: string; status: string }>,
      string | { id: string; status: 'transferred' | 'withdrawn' | 'expelled' | 'inactive'; reason?: string }
    >({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const body = typeof arg === 'string' ? undefined : { status: arg.status, reason: arg.reason };
        return { url: `/students/${id}`, method: 'DELETE', body };
      },
      invalidatesTags: [
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
        'Classes',
      ],
    }),

    bulkImportStudents: builder.mutation<ApiObject<BulkImportResult>, { csv: string }>({
      query: (body) => ({ url: '/students/bulk', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Students', id: 'LIST' },
        { type: 'Students', id: 'STATS' },
        'Students',
        'Classes',
      ],
    }),

    // Admin recovery path for a student/parent who never got (or lost)
    // their welcome-credentials email — mints a brand-new temp password and
    // resends it, no invalidation needed since it doesn't change anything
    // shown in the students list/table itself.
    resendStudentCredentials: builder.mutation<ApiObject<{ sentTo: string; tempPassword: string }>, { id: string; target: 'student' | 'parent' }>({
      query: ({ id, target }) => ({ url: `/students/${id}/resend-credentials`, method: 'POST', body: { target } }),
    }),

    // Admin or teacher (own sections only, enforced server-side) — mints a
    // brand-new PIN (random, or a custom one if `pin` is passed) and marks
    // pinState back to 'school_issued'. No list/detail invalidation needed,
    // the PIN itself isn't shown anywhere persisted — but roster queries
    // (pinState) should refresh.
    resetStudentPin: builder.mutation<ApiObject<{ pin: string }>, { id: string; pin?: string }>({
      query: ({ id, pin }) => ({ url: `/students/${id}/reset-pin`, method: 'POST', body: pin ? { pin } : {} }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Students', id: `ROSTER-${id}` }, 'StudentRoster'],
    }),

    // Student self-service — changes their own PIN, proving knowledge of the
    // current one. On success pinState flips to 'student_set' server-side.
    changeMyPin: builder.mutation<ApiObject<{ success: boolean }>, { currentPin: string; newPin: string }>({
      query: (body) => ({ url: '/students/me/change-pin', method: 'POST', body }),
    }),

    // Admin-only — decrypted PIN lookup, only non-null while pinState is
    // 'school_issued'. Explicit query (not auto-fetched) so the UI can
    // require a deliberate "Reveal" click rather than always showing PINs.
    getStudentPin: builder.query<ApiObject<{ pin: string | null; state: 'school_issued' | 'student_set' | null }>, string>({
      query: (id) => `/students/${id}/pin`,
    }),

    // Backs the "Resend parent login" / "Reset PIN" confirm dialogs — lazy
    // (fetched only when the admin opens one of those actions), so the
    // dialog can warn "this guardian already logged in, resending will
    // overwrite their password" / "this student already set their own PIN,
    // resetting will overwrite it" instead of firing blind.
    getStudentContactStatus: builder.query<
      ApiObject<{ guardian: { name: string; email: string | null; hasLoggedIn: boolean } | null; pinState: 'school_issued' | 'student_set' | null }>,
      string
    >({
      query: (id) => `/students/${id}/contact-status`,
    }),

    // Admin (any section) or teacher (their own assigned sections only,
    // enforced server-side — a 403 surfaces for a stale/foreign link).
    // `pin` is only present in each row for admin callers.
    getSectionRoster: builder.query<
      ApiObject<{
        className: string | null;
        section: string | null;
        students: {
          id: string;
          name: string;
          rollNumber: string;
          profilePhoto?: string | null;
          systemId: string | null;
          pinState: 'school_issued' | 'student_set';
          pin?: string | null;
        }[];
      }>,
      { classId: string; sectionId: string }
    >({
      query: ({ classId, sectionId }) => `/students/roster/${classId}/${sectionId}`,
      providesTags: ['StudentRoster'],
    }),

    // Admin-only CSV download — returns the raw Blob so the caller can
    // trigger a file save, same download-trigger pattern as the bulk-import
    // template's client-generated Blob in import-csv-drawer.tsx.
    exportSectionRoster: builder.query<Blob, { classId: string; sectionId: string }>({
      query: ({ classId, sectionId }) => ({
        url: `/students/roster/${classId}/${sectionId}/export`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    getIdCards: builder.query<ApiObject<IdCardSheet>, { classId: string; sectionId: string }>({
      query: ({ classId, sectionId }) => `/students/cards?classId=${classId}&sectionId=${sectionId}`,
      providesTags: [{ type: 'Students', id: 'LIST' }, 'Students'],
    }),

    // Admin-only bulk re-issue — resets cardIssueDate/cardExpiryDate for
    // every active student in one class/section. See student.service.ts's
    // reissueCards().
    reissueStudentCards: builder.mutation<ApiObject<{ updatedCount: number }>, { classId: string; sectionId: string }>({
      query: (body) => ({ url: '/students/reissue-cards', method: 'POST', body }),
      invalidatesTags: [{ type: 'Students', id: 'LIST' }, 'Students'],
    }),

    // Self-service — "My ID Card" page, for the student themself (or their
    // parent — pass studentId when the account has more than one child).
    getMyStudentContact: builder.query<ApiObject<MyStudentContactInfo>, { studentId?: string } | void>({
      query: (params) => `/students/me/contact${params?.studentId ? `?studentId=${params.studentId}` : ''}`,
      providesTags: ['MyStudentContact'],
    }),
    updateMyStudentContact: builder.mutation<
      ApiObject<MyStudentContactInfo>,
      { address?: string; city?: string; bloodGroup?: string; studentId?: string }
    >({
      query: (body) => ({ url: '/students/me/contact', method: 'PATCH', body }),
      invalidatesTags: ['MyStudentContact'],
    }),
    getMyStudentCard: builder.query<ApiObject<MyStudentCard>, { studentId?: string } | void>({
      query: (params) => `/students/me/card${params?.studentId ? `?studentId=${params.studentId}` : ''}`,
      providesTags: ['MyStudentContact'],
    }),

    // Matches backend gpa.service.ts's TermGpaResult/CumulativeGpaResult
    // shapes exactly (field-for-field) — do not rename.
    getStudentCgpa: builder.query<ApiObject<CumulativeGpaResult>, string>({
      query: (studentId) => `/students/${studentId}/cgpa`,
      providesTags: (_r, _e, studentId) => [{ type: 'Students', id: `CGPA-${studentId}` }],
    }),
    getStudentTermGpa: builder.query<ApiObject<TermGpaResult>, { studentId: string; termId: string }>({
      query: ({ studentId, termId }) => `/students/${studentId}/term-gpa/${termId}`,
      providesTags: (_r, _e, { studentId, termId }) => [{ type: 'Students', id: `TERMGPA-${studentId}-${termId}` }],
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useGetStudentStatsQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useBulkImportStudentsMutation,
  useResendStudentCredentialsMutation,
  useResetStudentPinMutation,
  useChangeMyPinMutation,
  useGetStudentPinQuery,
  useLazyGetStudentPinQuery,
  useLazyGetStudentContactStatusQuery,
  useGetSectionRosterQuery,
  useLazyExportSectionRosterQuery,
  useGetIdCardsQuery,
  useReissueStudentCardsMutation,
  useGetMyStudentContactQuery,
  useUpdateMyStudentContactMutation,
  useGetMyStudentCardQuery,
  useGetStudentCgpaQuery,
  useGetStudentTermGpaQuery,
} = studentsApi;
