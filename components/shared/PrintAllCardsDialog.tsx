'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Printer, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/get-error-message';

/**
 * Generic bulk-print modal — shows every card in `items` at once (front
 * only; the single-card preview flow elsewhere on each ID Cards tab is
 * still how anyone prints a back face) in a grid, both on screen as a
 * preview and, via #id-card-print-sheet (see idCardPrint.ts), as an actual
 * multi-card print layout. Generic over the item type so both
 * IdCardsView.tsx (students) and StaffIdCardsView.tsx (staff) can reuse it
 * with their own role-specific card component instead of duplicating this
 * dialog shell twice.
 *
 * Deliberately front-only and grid-only (no per-card actions, no editing)
 * — this is a "get a stack of cards printed" tool, not a browsing surface;
 * that's what the roster list right below it on each tab is for.
 */
export function PrintAllCardsDialog<T>({
  open, onClose, title, subtitle, items, renderCard, keyOf, downloadFileName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  /** File name for the "Download all" PDF — omit to hide that button
   *  entirely (some future caller might genuinely only want print). */
  downloadFileName?: string;
}) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const [downloading, setDownloading] = useState<{ done: number; total: number } | null>(null);

  const handleDownloadAll = async () => {
    const frontEls = items
      .map((item) => cardRefs.current.get(keyOf(item)))
      .filter((el): el is HTMLDivElement => !!el);
    if (frontEls.length === 0 || !downloadFileName) return;
    setDownloading({ done: 0, total: frontEls.length });
    try {
      const { downloadCardsGridPdf } = await import('@/components/shared/cardDownload');
      await downloadCardsGridPdf({
        frontEls,
        fileName: downloadFileName,
        onProgress: (done, total) => setDownloading({ done, total }),
      });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not generate the PDF'));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="no-print fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        {/* print:* overrides undo the modal's fixed/inset/overflow-hidden
            positioning at actual print time — #id-card-print-sheet inside
            (see idCardPrint.ts) is absolutely positioned relative to the
            nearest positioned ancestor, which would otherwise be THIS
            element (a `fixed` box establishes its own containing block),
            clipping the printed sheet to the on-screen modal's bounds
            instead of laying out across the full printed page. */}
        <DialogPrimitive.Content className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl focus:outline-none print:static print:inset-auto print:h-auto print:max-h-none print:w-auto print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:shadow-none sm:inset-8">
          <div className="no-print flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-semibold">{title}</DialogPrimitive.Title>
              {subtitle && <DialogPrimitive.Description className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</DialogPrimitive.Description>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {downloadFileName && (
                <Button size="sm" variant="outline" loading={!!downloading} onClick={handleDownloadAll}>
                  <Download size={15} />
                  {downloading ? `${downloading.done}/${downloading.total}…` : 'Download all'}
                </Button>
              )}
              <Button size="sm" onClick={() => window.print()}>
                <Printer size={15} /> Print {items.length} card{items.length === 1 ? '' : 's'}
              </Button>
              <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={18} />
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/20 p-6 print:overflow-visible print:bg-transparent print:p-0">
            <div id="id-card-print-sheet" className="grid grid-cols-1 place-items-center gap-6 sm:grid-cols-2">
              {items.map((item) => (
                <div key={keyOf(item)} ref={(el) => { if (el) cardRefs.current.set(keyOf(item), el); else cardRefs.current.delete(keyOf(item)); }}>
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
