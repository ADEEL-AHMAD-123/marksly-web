'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAttendanceCoverageTodayQuery } from '@/store/api/attendanceApi';
import { formatDate } from '@/lib/utils';
import { todayStr } from '@/lib/institution-date';

/**
 * Answers "which teachers haven't marked attendance today (or on some
 * other date), and what's actually outstanding" -- a distinct question
 * from the Report tab (which is about records that already exist). Its
 * own date picker rather than sharing the report's dateFrom/dateTo: this
 * is a same-day operational check ("who do I need to remind right now"),
 * not a range to browse.
 *
 * Lives in its own "Coverage" tab (see AttendanceView) rather than as a
 * strip pinned above the report -- that made the report page feel
 * cluttered and, before this tab existed, this panel had to be collapsed
 * by default just to stay out of the way. As its own tab it can just show
 * everything plainly.
 */
export function AttendanceMarkingStatus() {
  const [date, setDate] = useState(todayStr());
  const { data, isLoading } = useGetAttendanceCoverageTodayQuery({ date });
  const coverage = data?.data;

  // unmarkedPeriods is already time-gated server-side (a period only
  // shows up here once it's actually over) -- so this list is the
  // OVERDUE set, not "everything not yet marked".
  const overdue = (coverage?.classes ?? []).flatMap((c) =>
    c.sections
      .filter((s) => s.unmarkedPeriods.length > 0)
      .map((s) => ({ className: c.className, sectionName: s.sectionName, periods: s.unmarkedPeriods }))
  );
  const overduePeriodCount = overdue.reduce((n, u) => n + u.periods.length, 0);
  const fullyMarked = !!coverage && coverage.markedSections === coverage.totalSections;
  const hasOverdue = overdue.length > 0;
  const dateLabel = date === todayStr() ? 'today' : formatDate(date);
  // Nothing was even scheduled this day (weekend, holiday, timetable not
  // set up yet) -- there's nothing to check, so say that plainly instead
  // of a misleading "0 marked".
  const nothingScheduled = !isLoading && (!coverage || coverage.totalSections === 0);

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {nothingScheduled ? (
            <Clock size={18} className="shrink-0 text-muted-foreground" />
          ) : fullyMarked ? (
            <CheckCircle2 size={18} className="shrink-0 text-success" />
          ) : hasOverdue ? (
            <AlertTriangle size={18} className="shrink-0 text-warning" />
          ) : (
            <Clock size={18} className="shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {nothingScheduled
                ? `Nothing scheduled for ${dateLabel}`
                : fullyMarked
                ? `All attendance marked for ${dateLabel}`
                : hasOverdue
                ? `${overduePeriodCount} period${overduePeriodCount === 1 ? '' : 's'} overdue across ${overdue.length} section${overdue.length === 1 ? '' : 's'} — ${dateLabel}`
                : `${coverage!.markedSections} of ${coverage!.totalSections} section${coverage!.totalSections === 1 ? '' : 's'} marked so far — ${dateLabel}`}
            </p>
            {!nothingScheduled && coverage && (
              <p className="text-xs text-muted-foreground">
                {fullyMarked || hasOverdue
                  ? `${coverage.markedSections} of ${coverage.totalSections} section${coverage.totalSections === 1 ? '' : 's'} fully marked`
                  : `Not overdue — the remaining periods haven't finished yet`}
              </p>
            )}
          </div>
        </div>
        <input
          type="date"
          value={date}
          max={todayStr()}
          aria-label="Check a different date"
          onChange={(e) => setDate(e.target.value)}
          className="h-9 shrink-0 rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Card>

      {isLoading ? (
        <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>
      ) : nothingScheduled ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="Nothing scheduled"
            description={`No periods were scheduled for ${dateLabel} — there's nothing to check.`}
          />
        </Card>
      ) : hasOverdue ? (
        <Card className="divide-y divide-border p-0">
          {overdue.map((u, i) => (
            <div key={i} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Users size={14} className="text-muted-foreground" />
                {u.className}{u.sectionName ? ` – ${u.sectionName}` : ''}
              </div>
              <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                {u.periods.map((p, pi) => (
                  <span
                    key={pi}
                    className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-xs text-foreground"
                  >
                    {p.subject ?? 'Period'}
                    {p.startTime ? ` · ${p.startTime}${p.endTime ? `–${p.endTime}` : ''}` : ''}
                    {p.teacherName ? ` · ${p.teacherName}` : ' · No teacher assigned'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title={fullyMarked ? 'All caught up' : 'Nothing overdue yet'}
            description={
              fullyMarked
                ? `Every scheduled period for ${dateLabel} has been marked.`
                : `The remaining periods for ${dateLabel} haven't finished yet, so there's nothing to chase down.`
            }
          />
        </Card>
      )}
    </div>
  );
}
