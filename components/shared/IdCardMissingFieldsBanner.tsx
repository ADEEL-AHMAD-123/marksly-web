'use client';

import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface IdCardMissingFieldItem {
  key: string;
  label: string;
  /** True for a field that's actually required to issue this card at all
   *  (see REQUIRED_CARD_KEYS in lib/id-card-missing.ts — currently photo and
   *  national ID) as opposed to one the card simply renders without
   *  (address, blood group, parent info). Defaults to false so existing
   *  callers that don't set it keep the calmer "optional" styling. */
  required?: boolean;
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
 * Strip for the admin/teacher single-card preview (IdCardsView.tsx /
 * StaffIdCardsView.tsx) listing whatever's missing for what's currently
 * configured to show on the card, each with a direct way to fix it. Renders
 * nothing when `items` is empty — absence of this banner IS the positive
 * signal, so we deliberately don't render an "all good" state.
 *
 * Switches to a danger/blocking presentation the moment any item is
 * `required` — a missing photo or national ID doesn't just render with a
 * blank, it means the card shouldn't be printed or downloaded yet, which is
 * a materially different (and more urgent) message than "this is missing,
 * fix it whenever."
 */
export function IdCardMissingFieldsBanner({ items }: { items: IdCardMissingFieldItem[] }) {
  if (items.length === 0) return null;

  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const blocking = required.length > 0;

  // All fixable items open the same dialog, so a single button covers every
  // one of them rather than one button per field.
  const cardDetailsAction = items.find((i) => i.action.type === 'cardDetails')?.action;

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-4 no-print sm:flex-row sm:items-center sm:justify-between',
        blocking ? 'border-danger/40 bg-danger-soft' : 'border-warning/40 bg-warning-soft'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            blocking ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
          )}
        >
          {blocking ? <ShieldAlert size={16} /> : <AlertCircle size={16} />}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {blocking
              ? `Cannot be printed or downloaded — missing ${required.map((i) => i.label).join(', ')}`
              : `Missing: ${items.map((i) => i.label).join(', ')}`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {blocking
              ? optional.length > 0
                ? `Also missing (optional, won't block issuing): ${optional.map((i) => i.label).join(', ')}.`
                : 'A photo and a national ID number are the two things this card actually needs to identify someone — add them to enable printing and downloading.'
              : 'This card renders without these — add them any time.'}
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
