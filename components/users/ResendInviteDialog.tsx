'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useResendInviteMutation } from '@/store/api/usersApi';
import { getErrorCode, getErrorDetails, getErrorMessage } from '@/lib/get-error-message';
import { DomainConfirmDialog } from './DomainConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  name: string;
  currentEmail: string;
}

/**
 * The admin-facing recovery path for a bounced/failed/never-received staff
 * invite (see user.service.ts's resendInvite()) — lets the admin fix a
 * typo'd email in the same step as resending, rather than a separate
 * edit-then-resend round trip. Chains into the same domain-confirm step
 * create() uses if the (possibly corrected) address still looks unusual.
 */
export function ResendInviteDialog({ open, onClose, userId, name, currentEmail }: Props) {
  const [email, setEmail] = useState(currentEmail);
  const [domainIssue, setDomainIssue] = useState<{ domain: string; email: string } | null>(null);
  const [resendInvite, { isLoading }] = useResendInviteMutation();

  const submit = async (confirmUnverifiedEmail?: boolean) => {
    try {
      await resendInvite({
        id: userId,
        email: email !== currentEmail ? email : undefined,
        confirmUnverifiedEmail,
      }).unwrap();
      toast.success(`Invite resent to ${email}`);
      setDomainIssue(null);
      onClose();
    } catch (e: any) {
      if (getErrorCode(e) === 'EMAIL_DOMAIN_UNVERIFIED') {
        const details = getErrorDetails<{ domain: string; email: string }>(e);
        if (details) {
          setDomainIssue(details);
          return;
        }
      }
      toast.error(getErrorMessage(e, 'Could not resend invite'));
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={open && !domainIssue} onOpenChange={(o) => !o && onClose()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                <Send size={15} />
              </span>
              <DialogPrimitive.Title className="text-base font-semibold">Resend invite to {name}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              Confirm or fix the email address below before resending the activation link.
            </DialogPrimitive.Description>

            <div className="mt-4">
              <Label htmlFor="resend-email">Email</Label>
              <Input id="resend-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
              <Button size="sm" loading={isLoading} onClick={() => submit()}>Resend invite</Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {domainIssue && (
        <DomainConfirmDialog
          open
          domain={domainIssue.domain}
          email={domainIssue.email}
          loading={isLoading}
          onCancel={() => setDomainIssue(null)}
          onConfirm={() => submit(true)}
        />
      )}
    </>
  );
}
