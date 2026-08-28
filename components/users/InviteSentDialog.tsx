'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Mail, MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EmailDeliveryStatus } from '@/store/api/usersApi';

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  email: string;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailDeliveryError: string | null;
}

/**
 * Shown right after creating a teacher/staff/accountant account via the
 * invite-link flow (see user.service.ts's create()) — replaces
 * TempPasswordDialog for this path since there is no password to show
 * anymore. Unlike the old flow, this tells the admin the ACTUAL outcome of
 * the send attempt (sent vs. failed outright) rather than a blind "it was
 * emailed" — a hard failure here (bad address, Resend error) is visible
 * immediately instead of only being discovered when the teacher never
 * shows up.
 */
export function InviteSentDialog({ open, onClose, name, email, emailDeliveryStatus, emailDeliveryError }: Props) {
  const failed = emailDeliveryStatus === 'failed' || emailDeliveryStatus === 'bounced';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${failed ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary-soft-foreground'}`}>
              {failed ? <MailWarning size={16} /> : <Mail size={16} />}
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">
              {failed ? 'Account created — invite could not be sent' : `${name}'s account was created`}
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {failed ? (
              <>
                We couldn&apos;t deliver the activation email to{' '}
                <span dir="ltr" className="font-medium text-foreground">{email}</span>
                {emailDeliveryError ? <> — {emailDeliveryError}</> : null}. Fix the email address and use{' '}
                <span className="font-medium text-foreground">Resend invite</span> from the list.
              </>
            ) : (
              <>
                An activation link was sent to{' '}
                <span dir="ltr" className="font-medium text-foreground">{email}</span>. They&apos;ll choose their own
                password when they click it — no password exists until then, and they can&apos;t log in before that.
              </>
            )}
          </DialogPrimitive.Description>

          <div className="mt-5 flex items-center justify-end">
            <Button size="sm" onClick={onClose}>Got it</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
