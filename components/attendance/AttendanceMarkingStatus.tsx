'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useGetAttendanceCoverageTodayQuery } from '@/store/api/attendanceApi';
import { formatDate } from '@/lib/utils';
import { todayStr } from '@/lib/institution-date';

/**
 * Answers "which teachers haven't marked attendance today (or on some
 * other date), and what's actually outstanding" — a distinct question
 * from the report below it (which is about records that already exist).
 * Deliberately has its own date picker rather than sharing the report's
 * dateFrom/dateTo: this is a same-day operational check ("who do I need
 * to remind right now"), not a range to browse, and tying it to the
 * report's filters previously made it look like it was reacting to them
 * when it wasn't (see the earlier coverage-strip fix).
 */
export function AttendanceMarkingStatus() {
  const [date, setDate] = useState(todayStr());
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useGetAttendanceCoverageTodayQuery({ date });
  const coverage = data?.data;

  // Nothing was even scheduled this day (weekend, holiday, timetable not
  // set up yet) — there's nothing to check, so don't show a panel that
  // would otherwise misleadingly read as "0 marked".
  if (isLoading || !coverage || coverage.totalSections === 0) return null;

  const unmarked = coverage.classes.flatMap((c) =>
    c.sections
      .filter((s) => s.unmarkedPeriods.length > 0)
      .map((s) => ({ className: c.className, sectionName: s.sectionName, periods: s.unmarkedPeriods }))
  );
  const unmarkedPeriodCount = unmarked.reduce((n, u) => n + u.periods.length, 0);
  const allMarked = unmarked.length === 0;
  const dateLabel = date === todayStr() ? 'today' : formatDate(date);

  return (
    <Card className="overflow-hidden p-0 no-print">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {allMarked ? (
            <CheckCircle2 size={18} className="shrink-0 text-success" />
          ) : (
            <AlertTriangle size={18} className="shrink-0 text-warning" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {allMarked
                ? `All attendance marked for ${dateLabel}`
                : `${unmarkedPeriodCount} period${unmarkedPeriodCount === 1 ? '' : 's'} still need attendance — ${dateLabel}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {coverage.markedSections} of {coverage.totalSections} sections fully marked
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayStr()}
            aria-label="Check a different date"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {expanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && !allMarked && (
        <div className="divide-y divide-border border-t border-border">
          {unmarked.map((u, i) => (
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
        </div>
      )}
    </Card>
  );
}
