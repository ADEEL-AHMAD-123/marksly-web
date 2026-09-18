'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';

/**
 * Nudges a teacher/staff/accountant/parent with no email on file to add
 * one, now that email is optional for every role except admin/superadmin
 * (see user.model.ts's email `required` condition). Without an email,
 * "Forgot password?" has nothing to send a reset link to and the account
 * can only be recovered by an admin resetting the PIN by hand (see
 * ForgotPasswordView.tsx's matching "no email on file" note) — this is the
 * self-fixable half of that gap, surfaced where it's actually noticed
 * (the dashboard) rather than only at the moment recovery is needed.
 *
 * Links straight to Settings' existing Email address card
 * (SettingsView.tsx's EmailChangeCard) — that card already handles "add an
 * email for the first time" the same way it handles changing one (its
 * "Currently ... not set" copy already accounts for a blank email), so
 * nothing new had to be built there, just linked to.
 *
 * Reads straight off the auth slice (no extra API call needed — the
 * logged-in user's own email/role are already in Redux) and self-guards on
 * role, so it's safe to drop into any dashboard without an outer
 * role check: renders null for admin/superadmin (email already required
 * for them) and for anyone who already has one.
 */
export function DashboardEmailNudge() {
  const { user } = useAppSelector((s) => s.auth);
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed || user.email || user.role === 'admin' || user.role === 'superadmin') return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <Mail size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Add your email</p>
        <p className="text-xs text-muted-foreground">
          Without one, only your admin can reset your PIN if you ever forget it.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link href={`/${user.role}/settings`} className={cn(buttonVariants({ size: 'sm' }))}>
          Add email <ArrowRight size={14} />
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
