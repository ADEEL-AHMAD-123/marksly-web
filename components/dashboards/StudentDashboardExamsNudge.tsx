'use client';

import Link from 'next/link';
import { Laptop, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import { useMyOnlineExamsQuery } from '@/store/api/examAttemptApi';
import { classifyOnlineExam } from '@/lib/examStatus';

/** First thing a student should see if there's anything exam-related going
 *  on right now — this is the whole reason it renders at the very top of
 *  the student dashboard, above everything else (see StudentDashboardView).
 *  A "live" or "in progress" exam has a hard window and no reminder engine
 *  behind it beyond this, so surfacing it prominently is the difference
 *  between a student catching it and silently missing it. "Upcoming"
 *  (starts soon) gets a lighter-weight mention; "missed" is shown once,
 *  informationally, so a student isn't left wondering why an exam
 *  disappeared. */
export function StudentDashboardExamsNudge() {
  const { data, isLoading } = useMyOnlineExamsQuery();
  const exams = data?.data ?? [];

  if (isLoading) return <Card className="p-5"><Skeleton className="h-20 w-full" /></Card>;
  if (exams.length === 0) return null;

  const classified = exams.map((e) => ({ exam: e, status: classifyOnlineExam(e) }));
  const live = classified.filter((c) => c.status === 'in_progress' || c.status === 'live');
  const upcoming = classified.filter((c) => c.status === 'upcoming');
  const missed = classified.filter((c) => c.status === 'missed');

  // Nothing actionable or noteworthy right now — the dashboard stays quiet
  // rather than permanently reserving space for a "completed" exam list
  // (that's what /student/exams and Results are for).
  if (live.length === 0 && upcoming.length === 0 && missed.length === 0) return null;

  return (
    <Card className={live.some((c) => c.status === 'in_progress') ? 'border-danger/30' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Laptop size={18} /> Online Exams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {live.map(({ exam: e, status }) => (
          <div
            key={e.id}
            className={cn(
              'flex items-center justify-between gap-2 rounded-xl border p-3.5',
              status === 'in_progress' ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {e.subjectName ?? 'General'}
                {status === 'in_progress' ? ' · In progress — resume now' : e.durationMinutes ? ` · ${e.durationMinutes} min` : ''}
                {e.windowEnd && ` · Closes ${formatDate(e.windowEnd)}`}
              </p>
            </div>
            <Link href="/student/exams" className={buttonVariants({ size: 'sm', variant: 'primary' })}>
              {status === 'in_progress' ? 'Resume' : 'Start now'} <ArrowRight size={14} />
            </Link>
          </div>
        ))}

        {upcoming.length > 0 && (
          <div className="space-y-1.5">
            {upcoming.slice(0, 3).map(({ exam: e }) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={11} /> {e.subjectName ?? 'General'} · Opens {e.windowStart ? formatDate(e.windowStart) : 'soon'}
                  </p>
                </div>
                <Badge variant="outline">Upcoming</Badge>
              </div>
            ))}
          </div>
        )}

        {missed.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            <span>
              {missed.length === 1 ? `You missed "${missed[0].exam.title}"` : `You missed ${missed.length} exams`} — its window has closed.
              Contact your teacher if this needs to be resolved.
            </span>
          </div>
        )}

        {live.some((c) => c.status === 'in_progress') && (
          <p className="flex items-center gap-1.5 text-xs text-danger"><Clock size={12} /> You have an exam in progress — don&apos;t lose your window.</p>
        )}
      </CardContent>
    </Card>
  );
}
