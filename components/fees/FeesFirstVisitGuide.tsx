'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Wallet, FileText, Landmark, Receipt, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SLIDES = [
  {
    icon: Wallet,
    title: "Here's how fees work here",
    body: "You tell us what to charge. We generate the bills. Parents pay your own bank account directly -- Marksly never collects or holds the money.",
  },
  {
    icon: FileText,
    title: 'Step 1 — What you charge',
    body: 'Set up a fee structure (e.g. Monthly Tuition) once per class, or for everyone at once. This is the only place you tell Marksly an amount.',
  },
  {
    icon: Landmark,
    title: 'Step 2 — Where you get paid',
    body: 'Add at least one of your own bank accounts. This exact detail prints on every bill, so parents know where to send the money.',
  },
  {
    icon: Receipt,
    title: "Step 3 — You're set",
    body: 'Bills generate automatically from there. When a parent pays, you record it under Collections with their proof of payment -- that\'s the whole loop.',
  },
];

/**
 * A short, skippable orientation explaining the whole fee loop in plain
 * language -- answers "what am I even looking at" before the wizard-style
 * Add-structure/Add-account forms ask anything of the admin. Fully
 * controlled by the caller (FeesView.tsx decides when to auto-open it once
 * per institution, and also exposes a permanent "How does this work?" link
 * that reopens it on demand) rather than hiding its own show/hide logic,
 * so it's never a one-shot dialog an admin can't get back to.
 */
export function FeesFirstVisitGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [slide, setSlide] = useState(0);

  // Always start from the beginning on each fresh open, whether that's the
  // automatic first-visit trigger or a manual "How does this work?" click.
  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  const close = () => onClose();

  const s = SLIDES[slide];
  const Icon = s.icon;
  const isLast = slide === SLIDES.length - 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            <Icon size={20} />
          </div>
          <DialogPrimitive.Title className="mt-4 text-base font-semibold text-foreground">{s.title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">{s.body}</DialogPrimitive.Description>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <span key={i} className={cn('h-1.5 w-5 rounded-full', i === slide ? 'bg-primary' : 'bg-muted')} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isLast && (
                <button type="button" onClick={close} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Skip
                </button>
              )}
              <Button size="sm" onClick={() => (isLast ? close() : setSlide((n) => n + 1))}>
                {isLast ? 'Got it' : <>Next <ArrowRight size={14} /></>}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
