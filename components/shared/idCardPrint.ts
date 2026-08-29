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
    display: grid;
    grid-template-columns: repeat(2, ${CARD_WIDTH_MM}mm);
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
  /* Keep the "Powered by Marksly" credit visible when printed — it's
     genuinely part of the card design, not on-screen-only chrome, so it
     must not get caught by anything hiding non-#id-card-print content. */
  .id-card .id-card-credit {
    visibility: visible !important;
    opacity: 1 !important;
  }
}`;
