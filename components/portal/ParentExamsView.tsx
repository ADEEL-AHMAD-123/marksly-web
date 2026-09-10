'use client';

import Link from 'next/link';
import { AlertCircle, RefreshCw, Laptop } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { useChildrenExamsQuery, type MyOnlineExamItem } from '@/store/api/portalApi';
import { classifyOnlineExam, type OnlineExamNudgeStatus } from '@/lib/examStatus';

function statusBadge(status: OnlineExamNudgeStatus) {
  switch (status) {
    case 'in_progress':
      return <Badge variant="danger">In progress</Badge>;
    case 'live':
      return <Badge variant="warning">Live now</Badge>;
    case 'upcoming':
      return <Badge variant="outline">Upcoming</Badge>;
    case 'missed':
      return <Badge variant="danger">Missed</Badge>;
    case 'done':
    default:
      return <Badge variant="neutral">Completed</Badge>;
  }
}

/** Full, read-only exam schedule/status across every child — the parent
 *  equivalent of StudentExamsView, minus any take-the-exam action (only
 *  the student portal can start/answer/submit). Every exam is shown here,
 *  not just the actionable ones the dashboard nudge highlights, so a
 *  parent checking in has the complete picture: what's live, what's
 *  coming up, what was missed, and what's already done. */
export function ParentExamsView() {
  const { data, isLoading, isError, refetch } = useChildrenExamsQuery();
  const exams = data?.data ?? [];

  const byChild = new Map<string, { childName: string; items: (MyOnlineExamItem & { childId: string; childName: string })[] }>();
  for (const e of exams) {
    const entry = byChild.get(e.childId) ?? { childName: e.childName, items: [] };
    entry.items.push(e);
    byChild.set(e.childId, entry);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Online Exams" description="Every child's online exam schedule and status." />

      {isLoading ? (
        <Card className="p-5"><Skeleton className="h-40 w-full" /></Card>
      ) : isError ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="text-danger" size={28} />
          <p className="text-sm text-muted-foreground">Could not load exams.</p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}><RefreshCw size={14} /> Retry</Button>
        </Card>
      ) : byChild.size === 0 ? (
        <Card><EmptyState icon={Laptop} title="No online exams" description="Nothing scheduled for your children yet — this page updates automatically once a teacher schedules one." /></Card>
      ) : (
        Array.from(byChild.values()).map(({ childName, items }) => (
          <Card key={childName}>
            <CardHeader>
              <CardTitle>{childName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {items.map((e) => {
                const status = classifyOnlineExam(e);
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.subjectName ?? 'General'}
                        {e.durationMinutes ? ` · ${e.durationMinutes} min` : ''}
                        {e.windowStart && ` · Opens ${formatDate(e.windowStart)}`}
                        {e.windowEnd && ` · Closes ${formatDate(e.windowEnd)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {status === 'done' && (
                        <Link href="/parent/results" className="text-xs font-medium text-primary hover:underline">
                          View result
                        </Link>
                      )}
                      {statusBadge(status)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
