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
  #id-card-print, #id-card-print *,
  #id-card-print-sheet, #id-card-print-sheet * { visibility: visible !important; }
  #id-card-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    /* One card (front, then back) at a time — this is the single-person
       preview flow, so faces stack vertically rather than sitting in a
       multi-column grid. For printing many people at once, see
       #id-card-print-sheet below (PrintAllCardsDialog). */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6mm;
  }
  /* Bulk "Print all" sheet — a real multi-card layout (front only; the
     single-card flow above is still how anyone prints a back face) so a
     school issuing many cards at once doesn't have to repeat the
     single-card flow once per person. Two columns fit comfortably on A4
     with the CR80 physical width.

     Deliberately flexbox + wrap, NOT CSS grid — grid's row/track-based
     layout is known to paginate unreliably across multiple printed pages
     in several browsers (rows can get clipped or duplicated at a page
     break once there are more items than fit on one page), which this
     sheet needs to handle correctly for a school printing 50-60+ cards
     at once, not just the handful used while building/testing this. A
     flex-wrap row is plain block-level flow underneath, which print
     engines paginate the same reliable way they've always paginated
     ordinary wrapped content. */
  #id-card-print-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0 !important;
    background: transparent !important;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6mm 8mm;
  }
  .no-print { display: none !important; }
  .id-card {
    /* Both properties — break-inside is the modern name, page-break-inside
       the legacy alias some print engines still key off — kept one person's
       card from splitting across a page boundary regardless of which the
       browser actually implements. */
    break-inside: avoid;
    page-break-inside: avoid;
    width: ${CARD_WIDTH_MM}mm !important;
    height: ${CARD_HEIGHT_MM}mm !important;
    box-shadow: none !important;
    border: 1px solid #999 !important;
  }
  /* Keep the "Powered by marksly.pk" credit visible when printed — it's
     genuinely part of the card design, not on-screen-only chrome, so it
     must not get caught by anything hiding non-printed content. */
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

/** Short date format for the "Issued {date} | Valid until {date}" line
 *  shown on every card front — e.g. "12 Aug 2026". Returns null for
 *  missing/invalid input so callers can skip the line entirely rather than
 *  print "Invalid Date". */
export function formatCardDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Locked role-color palette for ID card headers — deliberately solid, dark,
 * high-contrast colors (not lighter/muted tints) per explicit product-owner
 * feedback that lighter headers read as low-contrast. Applied as an inline
 * backgroundColor (not a Tailwind bg-* class) specifically so nothing else
 * in the cascade can silently override it the way a utility class did in an
 * earlier mockup — text color on top of these should always be plain
 * `text-white`/`text-white/85`, never a semantic/muted token that could
 * resolve to a light color against these dark backgrounds.
 */
export const ID_CARD_ROLE_COLORS = {
  student: '#0f2a4a', // dark navy blue
  teacher: '#0d3b36', // dark teal/green
  staff: '#4a3220', // dark amber/brown
  accountant: '#2e1065', // dark indigo/purple
  admin: '#4a0f16', // dark maroon/red
} as const;
