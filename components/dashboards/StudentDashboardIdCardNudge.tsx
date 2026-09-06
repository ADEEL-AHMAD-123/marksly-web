'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, ArrowRight, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGetMyStudentCardQuery } from '@/store/api/studentsApi';

/** Same pattern as TeacherDashboardIdCardNudge — only shows while something
 *  is actually missing (address/blood group blocking the card, or the
 *  photo), and dismiss is session-only so a genuinely incomplete profile
 *  keeps resurfacing rather than getting permanently buried. */
export function StudentDashboardIdCardNudge() {
  const { data } = useGetMyStudentCardQuery();
  const card = data?.data;
  const [dismissed, setDismissed] = useState(false);

  if (!card || dismissed) return null;
  const needsInfo = card.missing.length > 0;
  const needsPhoto = card.photoMissing;
  if (!needsInfo && !needsPhoto) return null;

  const what = needsInfo && needsPhoto
    ? 'a couple of details and a photo'
    : needsInfo
      ? (card.missing.length === 1 ? 'one detail' : 'a couple of details')
      : 'a profile photo';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <CreditCard size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Get your student ID card</p>
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
