import { useGetMyInstitutionQuery } from '@/store/api/institutionApi';

export type AcademicStructure = 'yearly' | 'semester' | 'short_session' | 'custom';

export interface Terminology {
  term: string;
  termPlural: string;
  classUnit: string;
  classUnitPlural: string;
  section: string;
  sectionPlural: string;
  gradeLevel: string;
}

// Sensible generic-school-language defaults — used whenever the current
// institution's academicStructure isn't loaded yet (or the request for it
// failed), so labels are never blank/undefined while loading.
const DEFAULT_TERMINOLOGY: Terminology = {
  term: 'Academic Year',
  termPlural: 'Academic Years',
  classUnit: 'Class',
  classUnitPlural: 'Classes',
  section: 'Section',
  sectionPlural: 'Sections',
  gradeLevel: 'Grade',
};

const TERMINOLOGY_BY_STRUCTURE: Record<AcademicStructure, Terminology> = {
  // Schools/academies running a single school-year cycle — traditional
  // school language.
  yearly: {
    term: 'Academic Year',
    termPlural: 'Academic Years',
    classUnit: 'Class',
    classUnitPlural: 'Classes',
    section: 'Section',
    sectionPlural: 'Sections',
    gradeLevel: 'Grade',
  },
  // Colleges/universities running overlapping Fall/Spring/Summer terms —
  // university language.
  semester: {
    term: 'Semester',
    termPlural: 'Semesters',
    classUnit: 'Course',
    classUnitPlural: 'Courses',
    section: 'Section',
    sectionPlural: 'Sections',
    gradeLevel: 'Year',
  },
  // Academies/training centers running short, often concurrent batches —
  // academy language.
  short_session: {
    term: 'Session',
    termPlural: 'Sessions',
    classUnit: 'Course',
    classUnitPlural: 'Courses',
    section: 'Batch',
    sectionPlural: 'Batches',
    gradeLevel: 'Level',
  },
  // Institutions with a bespoke/mixed structure — generic fallback that
  // doesn't assume grade levels or a specific cadence.
  custom: {
    term: 'Term',
    termPlural: 'Terms',
    classUnit: 'Class',
    classUnitPlural: 'Classes',
    section: 'Section',
    sectionPlural: 'Sections',
    gradeLevel: 'Level',
  },
};

/** Pure lookup — no hooks, safe to use anywhere (server components,
 *  outside React, tests) once you already know the institution's
 *  academicStructure. */
export function getTerminology(academicStructure: AcademicStructure | undefined | null): Terminology {
  if (!academicStructure) return DEFAULT_TERMINOLOGY;
  return TERMINOLOGY_BY_STRUCTURE[academicStructure] ?? DEFAULT_TERMINOLOGY;
}

// A term's own `type` (see marksly-api's term.model.ts) is more specific
// than the institution's academicStructure — an institution can genuinely
// run mixed term types at once (e.g. yearly classes alongside a
// short-session course), so once a *specific* class/term is in view, its
// own type should win over the institution-wide guess.
type TermType = 'academic_year' | 'semester' | 'trimester' | 'short_session' | 'custom';

const STRUCTURE_BY_TERM_TYPE: Record<TermType, AcademicStructure> = {
  academic_year: 'yearly',
  semester: 'semester',
  trimester: 'semester',
  short_session: 'short_session',
  custom: 'custom',
};

/** Terminology for one specific term's type, when known — use this once a
 *  specific class/term is selected (e.g. in a class picker), instead of the
 *  institution-wide useTerminology(), so mixed-structure institutions show
 *  the right word ("Batch" for a short-session course) for that item
 *  specifically. Returns null when the type isn't known yet (nothing
 *  selected, or an older class predating this field), so callers can fall
 *  back to the institution-wide terminology in that case. */
export function getTerminologyForTermType(termType: string | null | undefined): Terminology | null {
  if (!termType) return null;
  const structure = STRUCTURE_BY_TERM_TYPE[termType as TermType];
  return structure ? TERMINOLOGY_BY_STRUCTURE[structure] : null;
}

/** Reads the current user's institution (via the same
 *  useGetMyInstitutionQuery RTK Query hook already used elsewhere, e.g.
 *  components/settings/InstitutionProfileTab.tsx — RTK Query dedupes/caches
 *  this across every component that calls it, so this doesn't cause an
 *  extra network request beyond whatever's already in flight/cached) and
 *  returns the terminology that matches its academicStructure. Falls back
 *  to generic school-language defaults while loading or if the query
 *  hasn't resolved yet, so labels are never blank/undefined. */
export function useTerminology(): Terminology {
  const { data } = useGetMyInstitutionQuery();
  return getTerminology(data?.data?.academicStructure);
}
