'use client';

// Shared "turn an on-screen ID card DOM node into a downloadable PDF"
// mechanics — used by the admin single-card preview, the admin bulk
// "Print all" sheet, and every self-service "My ID Card" page, so all
// three produce visually identical PDFs instead of three separate
// implementations drifting apart. Client-side only (no server round trip)
// since every card the browser can already render is all the data
// generating one needs.
//
// Note on access: this module has no concept of "whose card is this" or
// any permission check at all — it just rasterizes whatever DOM element
// it's handed. That's deliberate. The admin pages only ever hand it
// elements for people the admin is already allowed to see cards for, and
// every self-service "My ID Card" page only ever renders the signed-in
// user's OWN card in the first place (see student.service.ts's /
// user.service.ts's getMyCard()) — there is no "download someone else's
// card" code path to lock down here, because the page itself never shows
// anyone a card other than their own.
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from './idCardPrint';

async function captureEl(el: HTMLElement): Promise<string> {
  const canvas = await html2canvas(el, {
    scale: 3, // crisp enough to actually be usable as a printed card later
    backgroundColor: '#ffffff',
    useCORS: true, // profile photos / institution logos are on Cloudinary, not same-origin
  });
  return canvas.toDataURL('image/png');
}

/**
 * html2canvas can't rasterize a display:none element, but a card's back
 * face is normally only ever un-hidden by flipping the on-screen "Flip to
 * back" toggle (see IdCardsView.tsx's showBack state) — its wrapper div
 * carries a plain `hidden` class the rest of the time. Rather than forcing
 * a React re-render (and dealing with the async timing of "wait for the
 * flip to actually paint before capturing"), this reaches past React for a
 * moment: force the element visible via an inline style override, capture
 * it, then remove that override so the class-driven hidden state takes
 * back over exactly as it was.
 */
async function captureMaybeHidden(el: HTMLElement): Promise<string> {
  const wasHidden = getComputedStyle(el).display === 'none';
  if (wasHidden) el.style.setProperty('display', 'block', 'important');
  try {
    return await captureEl(el);
  } finally {
    if (wasHidden) el.style.removeProperty('display');
  }
}

/**
 * One person's card as a PDF — front, then (if provided) back, each its
 * own page sized to the real CR80 card dimensions rather than a full A4
 * sheet, so the file is a small, single-purpose "this is the card" download
 * rather than a page with a card floating in the middle of it. Used by the
 * admin single-card preview's "Download card" button and every
 * self-service "My ID Card" page's "Download my card" button.
 */
export async function downloadCardPdf(opts: {
  frontEl: HTMLElement;
  backEl?: HTMLElement | null;
  fileName: string;
}): Promise<void> {
  const { frontEl, backEl, fileName } = opts;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_WIDTH_MM, CARD_HEIGHT_MM] });
  const front = await captureMaybeHidden(frontEl);
  pdf.addImage(front, 'PNG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  if (backEl) {
    const back = await captureMaybeHidden(backEl);
    pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
    pdf.addImage(back, 'PNG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  }
  pdf.save(fileName);
}

/**
 * Bulk download — front-only, laid out 2-per-row across A4 pages, matching
 * PrintAllCardsDialog's own print layout exactly (same card size, same
 * columns, same gaps — see idCardPrint.ts) so a downloaded PDF and a
 * printed sheet of the same roster look identical. Captures cards one at a
 * time (rather than all at once) to keep memory bounded for a roster of
 * 50-60+ students/staff.
 */
export async function downloadCardsGridPdf(opts: {
  frontEls: HTMLElement[];
  fileName: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<void> {
  const { frontEls, fileName, onProgress } = opts;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_WIDTH_MM = 210;
  const PAGE_HEIGHT_MM = 297;
  const MARGIN_MM = 10;
  const GAP_X_MM = 8;
  const GAP_Y_MM = 6;
  const COLS = 2;
  const ROWS_PER_PAGE = Math.floor((PAGE_HEIGHT_MM - MARGIN_MM * 2 + GAP_Y_MM) / (CARD_HEIGHT_MM + GAP_Y_MM));
  const gridWidth = COLS * CARD_WIDTH_MM + (COLS - 1) * GAP_X_MM;
  const startX = (PAGE_WIDTH_MM - gridWidth) / 2;

  let col = 0;
  let row = 0;
  for (let i = 0; i < frontEls.length; i++) {
    if (row >= ROWS_PER_PAGE) {
      pdf.addPage();
      row = 0;
      col = 0;
    }
    const dataUrl = await captureMaybeHidden(frontEls[i]);
    const x = startX + col * (CARD_WIDTH_MM + GAP_X_MM);
    const y = MARGIN_MM + row * (CARD_HEIGHT_MM + GAP_Y_MM);
    pdf.addImage(dataUrl, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    onProgress?.(i + 1, frontEls.length);
    col += 1;
    if (col >= COLS) {
      col = 0;
      row += 1;
    }
  }
  pdf.save(fileName);
}

/** Filesystem-safe-ish file name from a person's display name + a role/kind
 *  suffix — shared so every download button produces the same naming
 *  convention ("zaman-khan-student-id-card.pdf") instead of each call site
 *  inventing its own. */
export function cardFileName(name: string, suffix: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'card';
  return `${slug}-${suffix}.pdf`;
}
