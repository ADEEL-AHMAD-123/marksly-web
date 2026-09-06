/**
 * Heuristic-only check for "does this institution name look like it might
 * be an abbreviation rather than the full legal name?" — e.g. "FG" or
 * "Fazaia" typed instead of "Fazaia Degree College Risalpur".
 *
 * This name appears verbatim on ID cards, fee receipts, invoices, and
 * timetable headers, so an abbreviated entry silently propagates
 * everywhere. The check is deliberately soft: it only DRIVES A ONE-TIME,
 * DISMISSIBLE nudge (see InstitutionProfileTab.tsx / AdminDashboard.tsx),
 * never a hard validation rule — legitimately short real names (e.g.
 * "MIT", "LUMS") exist and must never be blocked or nagged repeatedly.
 *
 * Heuristic: short (<= 12 chars) AND has no spaces (a single "word"), OR
 * is short and fully upper-case (acronym-shaped, e.g. "FDCR"). Multi-word
 * names of any length are left alone since a real abbreviation is rarely
 * entered as multiple words.
 */
export function looksAbbreviated(name: string | undefined | null): boolean {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return false;

  const hasSpace = /\s/.test(trimmed);
  const isShort = trimmed.length <= 12;
  const isAllCapsWord = !hasSpace && /^[A-Z0-9&.\-]+$/.test(trimmed);

  if (!hasSpace && isShort) return true;
  if (isAllCapsWord && trimmed.length <= 16) return true;
  return false;
}
