'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShieldOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  institutionName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

/**
 * Dedicated confirm for suspending an institution — replaces a bare
 * window.confirm(). This immediately puts the institution's whole account
 * into read-only mode for every one of its users, so it gets the same
 * purpose-built treatment as other consequential status changes elsewhere
 * in the app (e.g. StudentDetailDrawer's end-enrollment flow), not the
 * shared ui/confirm-dialog.tsx (explicitly scoped to cheap-to-trigger,
 * not destructive, actions).
 */
export function SuspendInstitutionDialog({ open, institutionName, onClose, onConfirm, loading }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">Suspend {institutionName}?</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger-soft p-3">
            <ShieldOff size={16} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-xs text-foreground">
              Every user at this institution loses write access immediately — they can still view things, but
              can&apos;t save, add, or change anything until you reactivate them. This does not cancel or refund
              their subscription.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>Suspend institution</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
