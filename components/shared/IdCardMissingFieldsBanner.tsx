'use client';

import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface IdCardMissingFieldItem {
  key: string;
  label: string;
  /** Every missing field on this page now fixes through the same
   *  EditCardDetailsDialog already open on it — the dialog was expanded to
   *  cover address, parent/guardian info and photo alongside national ID/
   *  issue/expiry/blood group, so there's no separate "go edit the full
   *  profile" route anymore (that used to duplicate the record's own edit
   *  form for no reason and left photo/address unreachable from here).
   *  'none' is kept for the rare case a field genuinely has nowhere to be
   *  fixed from this page. */
  action:
    | { type: 'cardDetails'; onClick: () => void }
    | { type: 'none' };
}

/**
 * Calm, non-alarming strip for the admin/teacher single-card preview
 * (IdCardsView.tsx / StaffIdCardsView.tsx) listing whatever's missing for
 * what's currently configured to show on the card, each with a direct way
 * to fix it. Renders nothing when `items` is empty — absence of this banner
 * IS the positive signal, so we deliberately don't render an "all good"
 * state.
 */
export function IdCardMissingFieldsBanner({ items }: { items: IdCardMissingFieldItem[] }) {
  if (items.length === 0) return null;

  // All fixable items open the same dialog, so a single button covers every
  // one of them rather than one button per field.
  const cardDetailsAction = items.find((i) => i.action.type === 'cardDetails')?.action;

  return (
    <Card className="flex flex-col gap-3 border-warning/40 bg-warning-soft p-4 no-print sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertCircle size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Missing: {items.map((i) => i.label).join(', ')}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            This card renders without these — add them any time.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {cardDetailsAction && cardDetailsAction.type === 'cardDetails' && (
          <Button size="sm" variant="outline" onClick={cardDetailsAction.onClick}>
            Edit card details
          </Button>
        )}
      </div>
    </Card>
  );
}
