'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  domain: string;
  email: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Shown when the backend's DNS check (see user.service.ts's
 * assertEmailDomainLooksReal()) finds a domain with no mail servers at
 * all — this is the "ask the admin if that's correct" step for a
 * mistyped/fake-looking email, surfaced immediately at creation time
 * instead of silently accepting it and only failing much later (or never
 * finding out at all, which was the original problem being solved here).
 */
export function DomainConfirmDialog({ open, domain, email, loading, onCancel, onConfirm }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-soft text-warning">
              <AlertTriangle size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">This email looks unusual</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description asChild>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>
                <span dir="ltr" className="font-medium text-foreground">{email}</span> — the domain{' '}
                <span dir="ltr" className="font-mono text-foreground">{domain}</span> doesn&apos;t appear to accept email
                (no mail servers found). If this is a typo, fix it before continuing; if you&apos;re sure it&apos;s
                correct, you can continue anyway.
              </p>
            </div>
          </DialogPrimitive.Description>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>Let me fix it</Button>
            <Button size="sm" loading={loading} onClick={onConfirm}>Yes, this is correct</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
