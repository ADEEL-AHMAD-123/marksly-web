import { CalendarCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatDate } from '@/lib/utils';
import type { AttendanceData, AttendanceStatus } from '@/store/api/portalApi';

const attBadge: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success', absent: 'danger', late: 'warning', leave: 'neutral',
};

export function AttendanceHistory({
  data,
  isLoading,
  isFetching,
}: {
  data?: AttendanceData;
  isLoading: boolean;
  // Optional — set when the caller lets a term filter re-trigger the query
  // while keeping previously-fetched data on screen. When true (and data
  // is already present), we dim/pulse the rate stat instead of collapsing
  // the whole card back to a skeleton, matching AttendanceReportView's
  // "no jarring full reload" treatment for term-scoped refetches.
  isFetching?: boolean;
}) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <p className="text-sm text-muted-foreground">Attendance rate</p>
          <p className="text-3xl font-bold text-foreground">{data.rate}%</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-soft text-success">
          {isFetching ? <Loader2 size={20} className="animate-spin" /> : <CalendarCheck size={24} />}
        </span>
      </Card>
      <Card className={cn('transition-opacity', isFetching && 'opacity-60')}>
        <CardHeader><CardTitle>Recent periods</CardTitle></CardHeader>
        <CardContent>
          {data.records.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No attendance recorded yet" />
          ) : (
            <ul className="divide-y divide-border">
              {data.records.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{formatDate(r.date)}</p>
                    {(r.subject || r.startTime) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {r.subject ?? 'Class'}{r.startTime ? ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ''}` : ''}
                      </p>
                    )}
                  </div>
                  <Badge variant={attBadge[r.status]} className="shrink-0 capitalize">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
