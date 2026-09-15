'use client';

import { CheckCircle2, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnboardingSteps } from '@/hooks/useOnboardingSteps';
import { OnboardingChecklist, OnboardingProgressBar } from '@/components/dashboards/AdminDashboardOnboarding';

/**
 * The same "get your institution ready" checklist the dashboard shows a
 * brand-new institution — but reachable here permanently, not just while
 * the dashboard is in its "nothing set up yet" full-page state. Once an
 * admin has done ANYTHING (added a class, a teacher, whatever), the
 * dashboard drops to a small "compact" reminder card that only lists what's
 * still left; this tab is where an admin can always come back to see the
 * FULL checklist (including steps already done) and re-check on progress,
 * without needing to remember which dashboard state they're currently in.
 */
export function SettingsSetupTab() {
  const { steps, isLoading, doneCount, totalSteps, allStepsDone, nextStepHref } = useOnboardingSteps();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              {allStepsDone ? <CheckCircle2 size={17} /> : <ListChecks size={17} />}
            </span>
            <div>
              <CardTitle>Setup checklist</CardTitle>
              <CardDescription>
                {allStepsDone
                  ? 'Everything on the setup checklist is done.'
                  : 'Steps to get your institution fully set up — pick up anywhere you left off.'}
              </CardDescription>
            </div>
          </div>
          {!isLoading && (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm">
              {doneCount}/{totalSteps} <span className="hidden sm:inline"> done</span>
            </span>
          )}
        </div>
        {!isLoading && <OnboardingProgressBar doneCount={doneCount} totalSteps={totalSteps} />}
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-72 w-full" /> : <OnboardingChecklist steps={steps} nextStepHref={nextStepHref} />}
      </CardContent>
    </Card>
  );
}
