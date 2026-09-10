'use client';

import Link from 'next/link';
import { Laptop, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import { useChildrenExamsQuery } from '@/store/api/portalApi';
import { classifyOnlineExam } from '@/lib/examStatus';

/** Parent-facing equivalent of StudentDashboardExamsNudge — same "live /
 *  upcoming / missed" classification, but across every child in one card,
 *  each row labeled with which child it's for. A parent can't take the
 *  exam on their child's behalf (no Start/Resume button here — only the
 *  student portal can start/answer/submit an attempt), so this is purely
 *  visibility: know when a child has something live right now, something
 *  coming up, or something they missed. */
export function ParentDashboardExamsNudge() {
  const { data, isLoading } = useChildrenExamsQuery();
  const exams = data?.data ?? [];

  if (isLoading) return <Card className="p-5"><Skeleton className="h-20 w-full" /></Card>;
  if (exams.length === 0) return null;

  const classified = exams.map((e) => ({ exam: e, status: classifyOnlineExam(e) }));
  const live = classified.filter((c) => c.status === 'in_progress' || c.status === 'live');
  const upcoming = classified.filter((c) => c.status === 'upcoming');
  const missed = classified.filter((c) => c.status === 'missed');

  if (live.length === 0 && upcoming.length === 0 && missed.length === 0) return null;

  return (
    <Card className={live.some((c) => c.status === 'in_progress') ? 'border-danger/30' : undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Laptop size={18} /> Online Exams</CardTitle>
        <Link href="/parent/exams" className="text-xs font-medium text-primary hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {live.slice(0, 4).map(({ exam: e, status }) => (
          <div
            key={`${e.childId}-${e.id}`}
            className={cn(
              'flex items-center justify-between gap-2 rounded-xl border p-3.5',
              status === 'in_progress' ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {e.childName} · {e.subjectName ?? 'General'}
                {status === 'in_progress' ? ' · In progress' : e.durationMinutes ? ` · ${e.durationMinutes} min` : ''}
                {e.windowEnd && ` · Closes ${formatDate(e.windowEnd)}`}
              </p>
            </div>
            <Badge variant={status === 'in_progress' ? 'danger' : 'warning'}>
              {status === 'in_progress' ? 'In progress' : 'Live now'}
            </Badge>
          </div>
        ))}

        {upcoming.length > 0 && (
          <div className="space-y-1.5">
            {upcoming.slice(0, 3).map(({ exam: e }) => (
              <div key={`${e.childId}-${e.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={11} /> {e.childName} · {e.subjectName ?? 'General'} · Opens {e.windowStart ? formatDate(e.windowStart) : 'soon'}
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
              {missed.length === 1
                ? `${missed[0].exam.childName} missed "${missed[0].exam.title}"`
                : `${missed.length} exams were missed`} — the window has closed. Contact the teacher if this needs to be resolved.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
