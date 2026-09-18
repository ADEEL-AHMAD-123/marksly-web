/**
 * Friendly display labels for ID-card field keys — shared across the
 * admin single-card preview banners (IdCardsView.tsx / StaffIdCardsView.tsx)
 * and the self-service missing-fields flow (MyIdCardView.tsx), so all three
 * surfaces describe the same field the same way.
 *
 * Deliberately just a label lookup, not a shared "compute what's missing"
 * function — the three call sites work off genuinely different data shapes
 * (list row / card-preview / self-service `missing: string[]`), so each
 * computes its own missing list and calls into this for display text only.
 */
export function idCardFieldLabel(key: string, nationalIdLabel = 'Form B'): string {
  switch (key) {
    case 'address':
      return 'Address';
    case 'bloodGroup':
      return 'Blood group';
    case 'parentInfo':
      return 'Parent/Guardian info';
    case 'nationalId':
      return `${nationalIdLabel} number`;
    case 'photo':
      return 'Photo';
    default:
      // Unknown/unmapped backend key — fall back to something readable
      // rather than a raw camelCase string.
      return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
  }
}

/**
 * Fields the backend's self-service `getMyCard` endpoints can ever include
 * in `missing` (see student.service.ts / user.service.ts) — confirmed by
 * reading the actual backend logic: 'address' and 'bloodGroup' (student
 * only), plus 'nationalId' (CNIC/Form-B) for both, now that self-service
 * editing of it exists (see updateMyContactSchema's/
 * updateMyStudentContactSchema's own comments on why that's no longer
 * admin-only). Anything else that shows up here is presumed admin-only —
 * i.e. not something the signed-in person has a mutation for.
 */
export const SELF_FIXABLE_MISSING_KEYS: ReadonlySet<string> = new Set(['address', 'bloodGroup', 'nationalId']);

/**
 * Single source of truth for "what's missing on this student's card,"
 * shared by the roster list's warning dot AND the single-card preview's
 * missing-fields banner (IdCardsView.tsx) — previously each recomputed its
 * own slightly different check (the roster list never looked at photo at
 * all), so a photo-less student could show no warning in the list but a
 * missing-photo badge on the card itself. One function, used both places,
 * so the two can never drift apart again.
 */
export function studentCardMissingKeys(
  student: {
    bloodGroup?: string | null;
    address?: string | null;
    city?: string | null;
    parentName?: string | null;
    nationalIdNumber?: string | null;
    profilePhoto?: string | null;
  },
  settings?: { showBloodGroup?: boolean; showNationalId?: boolean } | null
): string[] {
  const keys: string[] = [];
  if ((settings?.showBloodGroup ?? true) && !student.bloodGroup) keys.push('bloodGroup');
  if (!student.address && !student.city) keys.push('address');
  if (!student.parentName) keys.push('parentInfo');
  if ((settings?.showNationalId ?? true) && !student.nationalIdNumber) keys.push('nationalId');
  if (!student.profilePhoto) keys.push('photo');
  return keys;
}

/** Same idea as studentCardMissingKeys, for staff (StaffIdCardsView.tsx). */
export function staffCardMissingKeys(
  member: { address?: string | null; nationalIdNumber?: string | null; profilePhoto?: string | null },
  settings?: { showNationalId?: boolean } | null
): string[] {
  const keys: string[] = [];
  if (!member.address) keys.push('address');
  if ((settings?.showNationalId ?? true) && !member.nationalIdNumber) keys.push('nationalId');
  if (!member.profilePhoto) keys.push('photo');
  return keys;
}
