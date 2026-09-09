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
      // Unknown/未-mapped backend key — fall back to something readable
      // rather than a raw camelCase string.
      return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
  }
}

/**
 * Fields the backend's self-service `getMyCard` endpoints can ever include
 * in `missing` (see student.service.ts / user.service.ts) — confirmed by
 * reading the actual backend logic: only ever 'address' and 'bloodGroup'
 * (student only). Anything else that shows up here is presumed admin-only —
 * i.e. not something the signed-in person has a mutation for.
 */
export const SELF_FIXABLE_MISSING_KEYS: ReadonlySet<string> = new Set(['address', 'bloodGroup']);
