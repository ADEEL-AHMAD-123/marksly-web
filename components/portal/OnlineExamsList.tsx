'use client';

import Link from 'next/link';
import { FileText, Clock, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { MyOnlineExamItem } from '@/store/api/examAttemptApi';

function formatWindow(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Opens ${fmt(start)}`;
  return `Closes ${fmt(end!)}`;
}

export function OnlineExamsList({ data, isLoading }: { data?: MyOnlineExamItem[]; isLoading: boolean }) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  if (data.length === 0) {
    return (
      <Card>
        <EmptyState icon={FileText} title="No online exams scheduled" description="Online exams for your class will appear here when they're scheduled." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((exam) => {
        const windowLabel = formatWindow(exam.windowStart, exam.windowEnd);
        const attemptsLabel = `${exam.attemptsUsed}/${exam.maxAttempts} attempt${exam.maxAttempts === 1 ? '' : 's'} used`;
        return (
          <Card key={exam.id}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle>{exam.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {exam.subjectName ?? 'General'}
                  {exam.durationMinutes ? ` · ${exam.durationMinutes} min` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {exam.hasInProgressAttempt ? (
                  <Badge variant="warning">In progress</Badge>
                ) : exam.canEnter ? (
                  <Badge variant="success">Open</Badge>
                ) : (
                  <Badge variant="neutral">Unavailable</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm text-muted-foreground">
                {windowLabel && (
                  <p className="flex items-center gap-1.5">
                    <Clock size={14} /> {windowLabel}
                  </p>
                )}
                <p>{attemptsLabel}</p>
                {exam.integrityMode === 'fullscreen_lock' && (
                  <p className="flex items-center gap-1.5 text-xs">
                    <ShieldAlert size={12} /> Requires fullscreen mode
                  </p>
                )}
              </div>
              {exam.canEnter ? (
                <Link href={`/exams/${exam.id}/take`}>
                  <Button variant="primary" size="sm">
                    {exam.hasInProgressAttempt ? 'Resume exam' : 'Take exam'}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  {exam.attemptsUsed >= exam.maxAttempts ? 'No attempts left' : 'Not open'}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
