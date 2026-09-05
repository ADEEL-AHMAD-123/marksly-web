'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export interface OnboardingStep {
  label: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
  hint?: string;
}

/** Slim progress bar + fraction text, shared by the full checklist card and
 *  the compact "Finish setting up" card so both read the same way. Purely
 *  visual — no logic of its own, just renders whatever counts it's given. */
export function OnboardingProgressBar({ doneCount, totalSteps }: { doneCount: number; totalSteps: number }) {
  const pct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${doneCount} of ${totalSteps} setup steps complete`}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Each step's `done` state is checked live against real data (classes,
 *  teachers, students, fee structures) — see AdminDashboard's own hooks for
 *  exactly what each one checks. A completed step shows a checkmark and
 *  stays clickable (so an admin can still go add a second class, more
 *  teachers, etc.) rather than disappearing or looking static. `nextStepHref`
 *  highlights the single next not-done step with a "Next" badge and a
 *  slightly stronger border, so a checklist with several open items still
 *  gives a clear "start here" instead of leaving every open row looking
 *  equally important. */
export function OnboardingChecklist({ steps, nextStepHref }: { steps: OnboardingStep[]; nextStepHref?: string }) {
  return (
    <ul className="space-y-2">
      {steps.map((step, i) => {
        const isNext = !step.done && step.href === nextStepHref;
        return (
          <li key={step.href}>
            <Link
              href={step.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
                step.done
                  ? 'border-transparent bg-transparent hover:bg-muted/60'
                  : isNext
                    ? 'border-primary/40 bg-primary-soft/40 hover:border-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  step.done
                    ? 'bg-success-soft text-success'
                    : isNext
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {step.done ? <CheckCircle2 size={16} /> : i + 1}
              </span>
              <step.icon size={16} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-medium', step.done && 'text-muted-foreground line-through')}>
                  {step.label}
                </span>
                {step.hint && !step.done && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{step.hint}</span>
                )}
              </span>
              {step.done ? (
                <span className="shrink-0 text-xs font-medium text-success">Done</span>
              ) : isNext ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                  Next <ArrowRight size={12} />
                </span>
              ) : (
                <ArrowRight size={16} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The onboarding checklist card, shown either as the full "Get your
 *  institution ready" card (new institution, nothing done yet) or the
 *  compact "Finish setting up" card (some progress already made) — both
 *  share the same header/progress-bar/list shape, just with different
 *  copy and a filtered step list. */
export function OnboardingCard({
  variant,
  steps,
  nextStepHref,
  doneCount,
  totalSteps,
}: {
  variant: 'new' | 'compact';
  steps: OnboardingStep[];
  nextStepHref?: string;
  doneCount: number;
  totalSteps: number;
}) {
  const title = variant === 'new' ? 'Get your institution ready' : 'Finish setting up';
  const description = variant === 'new'
    ? "You haven't added any data yet — follow these steps to start using Marksly."
    : 'A few things are still left from your setup checklist.';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Sparkles size={17} />
            </span>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm">
            {doneCount}/{totalSteps} <span className="hidden sm:inline"> done</span>
          </span>
        </div>
        <OnboardingProgressBar doneCount={doneCount} totalSteps={totalSteps} />
      </CardHeader>
      <CardContent>
        <OnboardingChecklist steps={steps} nextStepHref={nextStepHref} />
      </CardContent>
    </Card>
  );
}
