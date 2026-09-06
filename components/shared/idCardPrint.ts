// Shared print mechanics for every printable ID card in the app (student
// cards in IdCardsView.tsx, staff cards in StaffIdCardsView.tsx) — kept in
// one place so both use identical physical card sizing/print rules instead
// of drifting apart. Only the card's own visual design (colors/layout of
// its content) is expected to differ between roles; the print grid/sizing
// below is not.

// CR80 (standard ID card) size: 85.6mm x 54mm, ratio ~1.586:1.
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 54;

// The on-screen preview uses the same ratio at a larger, legible size; the
// print stylesheet pins every card to the REAL physical dimensions (not
// just responsive flex/grid sizing) so what comes out of the printer is an
// actual CR80-sized card, and lays out a fixed grid of them per page.
export const ID_CARD_PRINT_CSS = `
@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  #id-card-print, #id-card-print * { visibility: visible !important; }
  #id-card-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0;
    /* One card (front, then back) at a time — this app only ever shows a
       single person's card, never a bulk sheet — so faces stack vertically
       rather than sitting in a multi-column grid meant for many cards. */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6mm;
  }
  .no-print { display: none !important; }
  .id-card {
    break-inside: avoid;
    width: ${CARD_WIDTH_MM}mm !important;
    height: ${CARD_HEIGHT_MM}mm !important;
    box-shadow: none !important;
    border: 1px solid #999 !important;
  }
  /* Keep the "Powered by marksly.pk" credit visible when printed — it's
     genuinely part of the card design, not on-screen-only chrome, so it
     must not get caught by anything hiding non-#id-card-print content. */
  .id-card .id-card-credit {
    visibility: visible !important;
    opacity: 1 !important;
  }
}`;

/**
 * Institution names vary wildly in length ("MIT" vs "Fazaia Degree College
 * Risalpur"), but the header band they sit in is fixed-height (part of a
 * fixed-aspect-ratio physical card). Rather than clipping a long name to a
 * single truncated line, this scales the font down as the name gets longer
 * and lets it wrap onto a second line (see the shared `line-clamp-2` usage
 * in IdCardsView.tsx / StaffIdCardsView.tsx) — long names stay fully
 * readable instead of ending in "...".
 */
export function idCardNameSizeClass(name: string): string {
  const len = name.trim().length;
  if (len <= 22) return 'text-[13px]';
  if (len <= 34) return 'text-[11.5px]';
  if (len <= 48) return 'text-[10px]';
  return 'text-[9px]';
}
