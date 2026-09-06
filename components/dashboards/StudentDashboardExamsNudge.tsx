'use client';

import Link from 'next/link';
import { HelpCircle, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyOnlineExamsQuery } from '@/store/api/examAttemptApi';

/** Online exams currently open (or about to be) for the student — a
 *  "don't forget this" nudge, since these have a hard window and are easy
 *  to miss without a dedicated reminder on the landing page. */
export function StudentDashboardExamsNudge() {
  const { data, isLoading } = useMyOnlineExamsQuery();
  const exams = data?.data ?? [];
  const actionable = exams.filter((e) => e.canEnter || e.hasInProgressAttempt);

  if (isLoading) return <Card className="p-5"><Skeleton className="h-20 w-full" /></Card>;
  if (actionable.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HelpCircle size={18} /> Online Exams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionable.slice(0, 3).map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {e.subjectName ?? 'General'}
                {e.hasInProgressAttempt ? ' · In progress' : e.durationMinutes ? ` · ${e.durationMinutes} min` : ''}
              </p>
            </div>
            <Link href="/student/exams" className={buttonVariants({ size: 'sm', variant: e.hasInProgressAttempt ? 'primary' : 'outline' })}>
              {e.hasInProgressAttempt ? 'Resume' : 'Start'} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
        {actionable.some((e) => e.hasInProgressAttempt) && (
          <p className="flex items-center gap-1.5 text-xs text-danger"><Clock size={12} /> You have an exam in progress — don't lose your window.</p>
        )}
      </CardContent>
    </Card>
  );
}
