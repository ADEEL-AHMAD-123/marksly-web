'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  description: string;
  confirmLabel: string;
}

/** Shared confirmation dialog for the two bulk re-issue actions (students by
 *  section, staff by role) — same "this resets everyone's dates" warning
 *  shape either way, just different copy. See IdCardsView.tsx and
 *  StaffIdCardsView.tsx. */
export function ReissueCardsConfirmDialog({ open, onClose, onConfirm, loading, title, description, confirmLabel }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-soft p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-foreground">{description}</p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
