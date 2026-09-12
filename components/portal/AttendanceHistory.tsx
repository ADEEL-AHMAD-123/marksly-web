import { useMemo, useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatDate } from '@/lib/utils';
import type { AttendanceData, AttendanceStatus } from '@/store/api/portalApi';

const attBadge: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success', absent: 'danger', late: 'warning', leave: 'neutral',
};

// Worst-first ranking for collapsing several same-day periods into one
// day-level status for the pattern view below — a single absent period
// makes the day read as "absent" even if the student was present for
// every other period that day, since that's the status a parent/student
// actually cares about noticing.
const STATUS_RANK: Record<AttendanceStatus, number> = { absent: 3, late: 2, leave: 1, present: 0 };
const DOT_CLASS: Record<AttendanceStatus, string> = {
  present: 'bg-success', absent: 'bg-danger', late: 'bg-warning', leave: 'bg-muted-foreground/50',
};

const PAGE_SIZE = 15;

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
  const [view, setView] = useState<'list' | 'pattern'>('list');
  // How many of the (already fully-fetched) records to actually render —
  // the API returns every record with no server-side pagination, so a
  // heavily-scheduled student's full term could otherwise render as one
  // very long unpaginated list. Client-side "load more" windowing keeps
  // the initial render short without needing a backend change.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const dayStatuses = useMemo(() => {
    if (!data) return [];
    const byDate = new Map<string, AttendanceStatus>();
    for (const r of data.records) {
      const existing = byDate.get(r.date);
      if (!existing || STATUS_RANK[r.status] > STATUS_RANK[existing]) byDate.set(r.date, r.status);
    }
    return Array.from(byDate.entries())
      .map(([date, status]) => ({ date, status }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  const visibleRecords = data.records.slice(0, visibleCount);
  const hasMore = data.records.length > visibleCount;

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

      {data.records.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
            )}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView('pattern')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'pattern' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
            )}
          >
            Pattern
          </button>
        </div>
      )}

      {view === 'pattern' && data.records.length > 0 ? (
        <Card className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <CardHeader>
            <CardTitle>Day-by-day pattern</CardTitle>
          </CardHeader>
          <CardContent>
            {/* A day with more than one period collapses to its single
                worst status (an absence anywhere that day outranks a
                present elsewhere) — the point of this view is spotting a
                pattern (e.g. "always absent on Mondays"), which a flat
                chronological list doesn't surface at a glance. */}
            <div className="flex flex-wrap gap-1">
              {dayStatuses.map((d) => (
                <span
                  key={d.date}
                  title={`${formatDate(d.date)} — ${d.status}`}
                  className={cn('h-3.5 w-3.5 rounded-sm', DOT_CLASS[d.status])}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Absent</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning" /> Late</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/50" /> Leave</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <CardHeader><CardTitle>Recent periods</CardTitle></CardHeader>
          <CardContent>
            {data.records.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No attendance recorded yet" />
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {visibleRecords.map((r, i) => (
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
                {hasMore && (
                  <div className="mt-3 flex justify-center">
                    <Button variant="secondary" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                      Show more ({data.records.length - visibleCount} left)
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
