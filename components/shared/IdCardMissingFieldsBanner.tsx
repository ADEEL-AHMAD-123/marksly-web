'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface IdCardMissingFieldItem {
  key: string;
  label: string;
  /** 'profile' → link to the person's full edit form (address/blood group/
   *  parent info — anything not owned by the card-details editor).
   *  'cardDetails' → open the EditCardDetailsDialog already on this page
   *  (national ID / issue / expiry — the focused editor for exactly those
   *  fields). */
  action:
    | { type: 'profile'; href: string }
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

  // Card-details fixes (national ID, etc.) all open the same dialog, so a
  // single button covers every item of that kind rather than one button per
  // field.
  const cardDetailsAction = items.find((i) => i.action.type === 'cardDetails')?.action;
  const profileItems = items.filter((i) => i.action.type === 'profile');

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
        {profileItems.length > 0 && profileItems[0].action.type === 'profile' && (
          <Link href={profileItems[0].action.href} className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }))}>
            Edit full profile
          </Link>
        )}
        {cardDetailsAction && cardDetailsAction.type === 'cardDetails' && (
          <Button size="sm" variant="outline" onClick={cardDetailsAction.onClick}>
            Edit card details
          </Button>
        )}
      </div>
    </Card>
  );
}
