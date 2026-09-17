'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Wallet, School, FileText, Users, Landmark, Receipt, CreditCard, ShieldCheck, ArrowLeft, ArrowRight, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Every slide is deliberately explicit about WHO does WHAT -- the previous
 * version said "you tell us what to charge," which reads like the admin is
 * meant to contact Marksly (support, a form, a request) to have someone
 * else configure it. Nothing here goes through Marksly: the admin sets
 * every value directly in this screen, themselves, with no request or
 * approval step involved. Each slide's `details` list exists so nothing
 * about the flow is left implicit or discovered by accident later.
 */
const SLIDES = [
  {
    icon: Wallet,
    title: "How fee collection works here",
    body: "Everything below happens inside this system -- you configure it yourself, directly, with no request or approval needed from Marksly. Marksly never collects, holds, or moves any of the money; whoever pays -- a parent, or the student directly -- always pays straight into your own bank account.",
    details: [
      'You decide what to charge and who it applies to.',
      'This system turns that into bills (invoices/challans) automatically.',
      'Parents or students pay your bank account directly -- never Marksly.',
      'You record each payment yourself once you receive it.',
    ],
  },
  {
    icon: School,
    title: 'Before you start — classes must exist',
    body: 'Fee structures are set up per class (or for every class at once), so at least one class needs to exist first. If you haven\'t added your classes yet, do that before setting up fees -- this screen will tell you if something is missing.',
    details: [
      'No classes yet? Go to Classes and add at least one first.',
      'Already have classes? You can skip straight to Step 1 below.',
    ],
  },
  {
    icon: FileText,
    title: 'Step 1 — Fee Structures (what you charge)',
    body: 'A "fee structure" is just a named amount you charge -- e.g. Monthly Tuition, Transport, Admission Fee. You create these yourself under the "Fee Structures" tab; nobody else sets this for you.',
    details: [
      'Give it a name, a category (Tuition, Transport, Library, etc.), and an amount.',
      'Choose a class, or leave it applying to every class at once.',
      'Choose how often it bills -- monthly, once, per term, and so on.',
      'You can add as many structures as you need -- one per fee type.',
    ],
  },
  {
    icon: Users,
    title: 'Who actually gets charged?',
    body: 'Most fees (like Tuition) apply automatically to everyone in the class you picked. Some fees only make sense for certain students -- for those, choose "opt-in" so nothing is charged until you explicitly add a student to it.',
    details: [
      '"Applies to everyone in class" -- billed automatically, no extra step.',
      '"Opt-in" -- billed only for students you manually add (e.g. Transport, Hostel).',
      'Nothing is ever billed to a student you haven\'t configured this for.',
    ],
  },
  {
    icon: Landmark,
    title: 'Step 2 — Bank Accounts (where you get paid)',
    body: 'Add at least one of your own real bank accounts under "Bank Accounts." This exact bank name, account number and IBAN is what gets printed on every bill, for whoever is paying it -- a parent or the student -- so double-check it carefully before saving.',
    details: [
      'You can add more than one account, and mark one as the default.',
      'No bank account on file yet means bills can\'t tell the payer where to send money -- so add this before generating real bills.',
      'You can preview exactly what the printed bill will look like anytime with "See a sample challan."',
    ],
  },
  {
    icon: Receipt,
    title: 'Step 3 — Bills generate, you get paid directly',
    body: 'Once a fee structure and a bank account exist, this system generates the actual bills (called invoices, or challans once printed) for every student they apply to -- automatically, on the schedule you set, or on demand with "Generate this month\'s bills."',
    details: [
      'Each bill shows your institution\'s branding and your bank details.',
      'A parent or the student pays directly into your account -- the same as a normal bank deposit.',
      'One-off charges (a fine, an event fee) don\'t need a fee structure -- use "One-time invoice" instead.',
    ],
  },
  {
    icon: CreditCard,
    title: "Step 4 — Recording a payment you've received",
    body: 'When a parent or student actually pays, you record it yourself under Collections -- enter the amount, the method, and a reference if you have one. The invoice\'s status (Pending, Partial, Paid, Overdue) updates automatically from what you record; you never set the status directly.',
    details: [
      'Works for any payment method -- cash handed in at your office, bank transfer, JazzCash, EasyPaisa, cheque, or online -- not online-only.',
      'A receipt is generated automatically once a payment is recorded.',
      'Paid too much or too little? Record exactly what was received -- overpayment can be banked as credit for next time.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Mistakes happen — nothing is ever silently changed',
    body: "If you record a payment wrong, you don't edit it -- you void it with a reason and record it again correctly. The full history always stays visible, so nothing about money is ever quietly overwritten or deleted.",
    details: [
      'Voided entries stay visible, marked as voided, with your reason attached.',
      'An invoice can be waived (forgiven) by an admin, but only before anything has been paid on it.',
    ],
  },
  {
    icon: Check,
    title: "You're ready",
    body: "That's the whole loop: set up what you charge, add where you get paid, bills generate, whoever is paying -- parent or student -- pays you directly by whatever method suits them, you record it. You can replay this walkthrough anytime from the \"How does this work?\" link, and preview a sample bill before anything real exists.",
    details: [],
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
  const isFirst = slide === 0;
  const isLast = slide === SLIDES.length - 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[94vw] max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex-1 overflow-y-auto p-6 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Icon size={20} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {slide + 1} of {SLIDES.length}
              </span>
            </div>

            <DialogPrimitive.Title className="mt-4 text-lg font-semibold leading-snug text-foreground">
              {s.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </DialogPrimitive.Description>

            {s.details.length > 0 && (
              <ul className="mt-3 space-y-1.5 rounded-xl bg-muted/60 p-3.5">
                {s.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <span key={i} className={cn('h-1.5 w-5 rounded-full', i === slide ? 'bg-primary' : 'bg-muted')} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setSlide((n) => n - 1)}>
                  <ArrowLeft size={14} /> Back
                </Button>
              )}
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
