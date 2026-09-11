'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type LucideIcon, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Explanation of what will actually happen — should say what the action
   *  DOES, not just name it, so the admin is deciding based on a real
   *  understanding rather than clicking through a generic "are you sure?".
   *  Accepts ReactNode so callers can bold specific facts (e.g. a name, a
   *  cost, a warning) rather than a flat paragraph. */
  description: React.ReactNode;
  confirmLabel: string;
  /** 'warning' when the action is reversible but costs something (an email
   *  send, overwriting a still-active credential) or needs a second look;
   *  'default' for a routine confirm with no real downside. There's no
   *  'danger' tone here on purpose — this component is for confirm-before-
   *  cost actions, not destructive ones (those already have their own
   *  purpose-built confirm UI, e.g. StudentDetailDrawer's end-enrollment
   *  flow, and shouldn't be generic). */
  tone?: 'warning' | 'default';
  loading?: boolean;
  icon?: LucideIcon;
}

/**
 * Generic "confirm before doing the costly/overwriting thing" dialog — built
 * for actions that are cheap to trigger by accident but not free to actually
 * run (sending an email that costs a send credit, overwriting a PIN/password
 * someone may have already personalized). Not for destructive/irreversible
 * actions, which get their own dedicated confirm UI elsewhere in the app.
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel, tone = 'default', loading, icon,
}: Props) {
  const Icon = icon ?? (tone === 'warning' ? AlertTriangle : Info);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary-soft-foreground'
              )}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="primary" size="sm" loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
