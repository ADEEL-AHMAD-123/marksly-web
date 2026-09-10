'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, ArrowRight, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGetMyCardQuery } from '@/store/api/usersApi';

/**
 * Shared across any non-admin dashboard (teacher, staff, ...) — useGetMyCard
 * already works for teacher/staff/accountant/admin alike (see users
 * module), so this was never really teacher-specific despite its old name.
 * Only rendered while there's something actually left to do (missing
 * contact info blocks the card, or the photo is missing) — once both are
 * done this returns null rather than becoming a permanent "here's your
 * card" ad. Dismiss is session-only (matches DashboardAlertBanner's own
 * pattern) — a real incomplete profile should keep resurfacing, not get
 * silently buried by one click.
 */
export function DashboardIdCardNudge() {
  const { data } = useGetMyCardQuery();
  const card = data?.data;
  const [dismissed, setDismissed] = useState(false);

  if (!card || dismissed) return null;
  const needsAddress = card.missing.length > 0;
  const needsPhoto = card.photoMissing;
  if (!needsAddress && !needsPhoto) return null;

  const what = needsAddress && needsPhoto ? 'your address and a photo' : needsAddress ? 'your address' : 'a profile photo';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <CreditCard size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Get your staff ID card</p>
        <p className="text-xs text-muted-foreground">Add {what} to unlock your printable ID card.</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link href="/my-id-card" className={cn(buttonVariants({ size: 'sm' }))}>
          Finish up <ArrowRight size={14} />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss for now"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
