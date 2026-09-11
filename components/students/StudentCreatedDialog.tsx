'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Copy, PartyPopper, KeyRound, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  studentName: string;
  systemId: string;
  studentPin: string;
  /** Absent when this student was added with no guardian linked yet. */
  guardian?: {
    name: string;
    pin: string;
    /** Whether the login-details email was sent (best-effort — see
     *  sendGuardianLoginEmail(), never a delivery guarantee). Purely
     *  informational copy, doesn't change what's shown. */
    emailed: boolean;
  } | null;
}

/**
 * Single combined "here's everyone's login" panel shown right after adding
 * a student — replaces the old sequential TempPasswordDialog queue (one
 * popup for the student, then another for the guardian, each requiring its
 * own dismiss click). Both logins use the exact same mechanism now (an ID +
 * a PIN, see the guardian PIN-login redesign), so showing them side by side
 * in one place — rather than as two separate "password created" interruptions
 * — better reflects that they're the same kind of thing and is easier to
 * read/copy/hand over in one go, e.g. printing an ID card or texting both to
 * a parent.
 */
export function StudentCreatedDialog({ open, onClose, studentName, systemId, studentPin, guardian }: Props) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const lines = [
      `${studentName} — Login ID: ${systemId}  PIN: ${studentPin}`,
      ...(guardian ? [`${guardian.name} (Parent) — PIN: ${guardian.pin} (use phone or email to sign in)`] : []),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — credentials are still visible
      // on screen to copy manually.
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success">
              <PartyPopper size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">
              {studentName} is all set up
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            Here's how {studentName.split(' ')[0]} {guardian ? 'and their parent' : ''} sign in. Both PINs are saved —
            you can view or reset them anytime from the Login IDs &amp; PINs page.
          </DialogPrimitive.Description>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-muted/50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <UserRound size={12} /> Student
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Login ID</span>
                  <span dir="ltr" className="font-mono font-medium">{systemId}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">PIN</span>
                  <span dir="ltr" className="font-mono font-semibold tracking-wide">{studentPin}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Signs in with this Login ID and PIN.</p>
            </div>

            {guardian ? (
              <div className="rounded-xl border border-border bg-muted/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users size={12} /> Parent — {guardian.name}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">PIN</span>
                  <span dir="ltr" className="font-mono font-semibold tracking-wide">{guardian.pin}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Signs in with their own phone number or email, plus this PIN — no separate Login ID needed.
                  {guardian.emailed ? ' We\'ve also emailed it to them, just as a convenience — it\'s not required for logging in.' : ''}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-3.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Users size={12} /> No parent/guardian added yet
                </div>
                <p className="mt-1">You can link one anytime by editing this student.</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={copyAll}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
