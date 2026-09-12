'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

/**
 * Dedicated confirm for turning off auto-renewal — replaces a bare
 * window.confirm(). Not the shared ui/confirm-dialog.tsx (that component is
 * explicitly for cheap-to-trigger-by-accident actions, not this one: it
 * removes a saved card and switches the institution back to manual
 * payment, which risks an accidental lapse into suspended/past_due if no
 * one remembers to pay next renewal). Same shape as
 * ReissueCardsConfirmDialog — a small, purpose-built dialog rather than a
 * generic "danger" variant.
 */
export function DisableAutoRenewDialog({ open, onClose, onConfirm, loading }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">Turn off auto-renewal?</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-soft p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-foreground">
              Your saved card will be removed and future renewals will need to be paid manually — if a renewal is
              missed, your subscription can lapse into <strong>past due</strong>. You can turn auto-renewal back on
              anytime from this page.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>Turn off auto-renewal</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
