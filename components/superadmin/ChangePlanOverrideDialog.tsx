'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  planType: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

/**
 * Dedicated confirm for a superadmin's direct plan override — replaces a
 * bare window.confirm(). Takes effect immediately and does NOT record a
 * payment (comp accounts / deals handled outside Marksly), so it needs a
 * real confirmation rather than a one-click dropdown change — same
 * reasoning as the original window.confirm, just in the app's own styled
 * dialog UI instead of the browser's, so the explanation is actually
 * legible rather than a plain-text alert.
 */
export function ChangePlanOverrideDialog({ open, planType, onClose, onConfirm, loading }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">Change to the &quot;{planType}&quot; plan?</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-soft p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-foreground">
              This is an administrative override — it takes effect immediately and does <strong>not</strong> record
              a payment. Use this for comp accounts or deals handled outside Marksly, not as a substitute for the
              institution actually paying.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={onConfirm}>Change plan</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
