'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Send, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { EmailLogEntry } from '@/store/api/emailLogApi';

interface Props {
  open: boolean;
  onClose: () => void;
  entry: EmailLogEntry | null;
  /** True while resendEmailLogMutation is in flight. */
  loading: boolean;
  /** Called with the (possibly corrected) email to resend to. */
  onConfirm: (email: string, confirmUnverifiedEmail?: boolean) => Promise<void> | void;
  /** Set after a 422 EMAIL_DOMAIN_UNVERIFIED response — lets the admin
   *  explicitly vouch for an address whose domain looks fake, same
   *  "did you mean...?" pattern used when adding a student/teacher. */
  domainWarning: string | null;
}

/**
 * The whole point of this dialog: a bounced/failed email is very often just
 * a mistyped address, so instead of a bare "Resend" button that resends to
 * the SAME wrong address, this shows the recipient as an editable field —
 * the admin can fix it right here before the email goes out again.
 */
export function ResendEmailLogDialog({ open, onClose, entry, loading, onConfirm, domainWarning }: Props) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (entry) setEmail(entry.to);
  }, [entry]);

  if (!entry) return null;

  const trimmed = email.trim();
  const changed = trimmed.toLowerCase() !== entry.to.toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  const canSubmit = isValid && !loading;
  const submit = () => {
    if (!canSubmit) return;
    onConfirm(trimmed, !!domainWarning);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onPointerDownOutside={(e) => loading && e.preventDefault()}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Mail size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">Resend email</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {entry.error
              ? `This didn't reach ${entry.to} — check the address is correct before sending again.`
              : `Sending this again to the address below.`}
          </DialogPrimitive.Description>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={entry.subject}>{entry.subject}</p>

          <form
            className="contents"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
          >
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="resend-email">Recipient email</Label>
              <Input
                id="resend-email"
                dir="ltr"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
                placeholder="name@example.com"
              />
              {!isValid && trimmed.length > 0 && (
                <p className="text-xs text-danger">Enter a valid email address.</p>
              )}
              {changed && isValid && (
                <p className="text-xs text-muted-foreground">
                  This will update the account&apos;s email on file to this address before resending.
                </p>
              )}
            </div>

            {domainWarning && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{domainWarning} Send anyway if you&apos;re sure this address is correct.</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit} loading={loading}>
                <Send size={13} /> {domainWarning ? 'Send anyway' : 'Resend'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
