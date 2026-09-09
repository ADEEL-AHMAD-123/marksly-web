'use client';

import { useMemo } from 'react';
import { CalendarClock, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TimetableEntry } from '@/store/api/timetableApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A row in the grid: possibly several distinct (startTime,endTime) pairs
 *  that all landed close enough together to share one visual row. Kept
 *  identical to TimeRow in TimetableView.tsx. */
interface TimeRow {
  members: Set<string>;
  startTime: string;
  endTime: string;
}

const ROW_MERGE_THRESHOLD_MIN = 10;

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Shared read-only weekly grid used by a teacher's own timetable, a
 * student's own timetable, and a parent viewing their child's timetable —
 * a genuine grid (days as columns, one row per distinct time range used
 * that week), matching the admin TimetableView.tsx layout/algorithm but
 * with no edit/copy/print controls. Only the subtitle line under each
 * period differs (a teacher cares which class/section; a student or parent
 * cares who's teaching it).
 */
export function TimetableWeekGrid({
  entries,
  isLoading,
  variant,
  emptyDescription,
}: {
  entries: TimetableEntry[];
  isLoading: boolean;
  variant: 'teacher' | 'viewer';
  emptyDescription?: string;
}) {
  const today = new Date().getDay();
  const distinctTermCount = useMemo(
    () => new Set(entries.map((e) => e.termId).filter(Boolean)).size,
    [entries]
  );
  const showTerm = distinctTermCount > 1;

  const byDay = useMemo(() => {
    const m: Record<number, TimetableEntry[]> = {};
    for (const e of entries) (m[e.dayOfWeek] ??= []).push(e);
    return m;
  }, [entries]);

  // Mon–Fri always shown; Sun/Sat only if they actually have a period, same
  // rule as the admin grid — avoids two permanently-empty weekend columns
  // for institutions running a 5-day week.
  const visibleDays = useMemo(() => {
    const hasEntries = new Set(entries.map((e) => e.dayOfWeek));
    return DAYS.map((day, idx) => ({ day, idx }))
      .filter(({ idx }) => (idx >= 1 && idx <= 5) || hasEntries.has(idx));
  }, [entries]);

  // Rows are formed by greedily grouping distinct (startTime,endTime) pairs
  // — sorted by start time — into overlap/proximity-based buckets, rather
  // than keying on the exact string, so two days with near-identical bell
  // times (e.g. Monday 09:00-09:45 vs Tuesday 09:00-09:40) land in the same
  // row instead of producing near-duplicate rows. A pair joins the current
  // row if its start time either overlaps the row's span so far, or is
  // within ROW_MERGE_THRESHOLD_MIN minutes of the row's current end;
  // genuinely different times of day (e.g. 9am vs 2pm) fall outside that
  // and start a new row. Identical algorithm to TimetableView.tsx so the
  // admin and read-only grids stay visually consistent. Each day still
  // renders its own exact start–end time inside its cell when it differs
  // from the row's shared label.
  const timeRows = useMemo(() => {
    const seen = new Map<string, { startTime: string; endTime: string }>();
    for (const e of entries) {
      const key = `${e.startTime}-${e.endTime}`;
      if (!seen.has(key)) seen.set(key, { startTime: e.startTime, endTime: e.endTime });
    }
    const distinct = Array.from(seen.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const rows: TimeRow[] = [];
    for (const pair of distinct) {
      const end = toMinutes(pair.endTime);
      const last = rows[rows.length - 1];
      if (last && toMinutes(pair.startTime) <= toMinutes(last.endTime) + ROW_MERGE_THRESHOLD_MIN) {
        last.members.add(pair.key);
        if (toMinutes(pair.startTime) < toMinutes(last.startTime)) last.startTime = pair.startTime;
        if (end > toMinutes(last.endTime)) last.endTime = pair.endTime;
      } else {
        rows.push({ members: new Set([pair.key]), startTime: pair.startTime, endTime: pair.endTime });
      }
    }
    return rows;
  }, [entries]);

  const cellFor = (dayIdx: number, row: TimeRow) =>
    (byDay[dayIdx] ?? []).find((e) => row.members.has(`${e.startTime}-${e.endTime}`)) ?? null;

  if (isLoading) {
    return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  }

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarClock}
          title="No schedule yet"
          description={emptyDescription ?? 'The timetable will appear here once it has been set up.'}
        />
      </Card>
    );
  }

  return (
    <>
      {/* Desktop: real grid */}
      <div className="hidden md:block">
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-28 border-r border-border px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Time</th>
                {visibleDays.map(({ day, idx }) => (
                  <th
                    key={day}
                    className={`border-r border-border px-3 py-2.5 text-left text-xs font-semibold last:border-r-0 ${idx === today ? 'bg-primary-soft text-primary' : 'text-foreground'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {day}
                      {idx === today && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">Today</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeRows.map((row) => (
                <tr key={Array.from(row.members).sort().join('|')} className="border-b border-border last:border-b-0">
                  <td className="border-r border-border px-3 py-2 align-top text-xs font-medium text-foreground">
                    {row.startTime}–{row.endTime}
                  </td>
                  {visibleDays.map(({ day, idx }) => {
                    const entry = cellFor(idx, row);
                    const entryTimeDiffers = entry
                      && (entry.startTime !== row.startTime || entry.endTime !== row.endTime);
                    return (
                      <td key={day} className={`border-r border-border px-2 py-1.5 align-top last:border-r-0 ${idx === today ? 'bg-primary-soft/30' : ''}`}>
                        {entry ? (
                          <div className="rounded-lg border border-border bg-card p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-semibold text-foreground">{entry.subject ?? 'Period'}</p>
                              {showTerm && entry.termName && <Badge variant="neutral" className="shrink-0">{entry.termName}</Badge>}
                            </div>
                            {entryTimeDiffers && (
                              <p className="truncate text-[10px] font-medium text-muted-foreground">{entry.startTime}–{entry.endTime}</p>
                            )}
                            <p className="truncate text-[11px] text-muted-foreground">
                              {variant === 'teacher' ? `${entry.className ?? ''} ${entry.section ?? ''}`.trim() : (entry.teacher ?? 'Unassigned')}
                            </p>
                            {entry.room && (
                              <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                <MapPin size={9} className="shrink-0" /> {entry.room}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="h-full min-h-[2.5rem]" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile: per-day card list */}
      <div className="space-y-4 md:hidden">
        {visibleDays.map(({ day, idx }) => {
          const periods = (byDay[idx] ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (periods.length === 0) return null;
          return (
            <Card key={day} className={`p-4 ${idx === today ? 'ring-2 ring-primary/40' : ''}`}>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                {day}{idx === today && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">Today</span>}
              </p>
              <ul className="space-y-2">
                {periods.map((e) => (
                  <li key={e.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1 text-xs font-medium text-foreground"><Clock size={12} /> {e.startTime}–{e.endTime}</p>
                      {showTerm && e.termName && <Badge variant="neutral" className="shrink-0">{e.termName}</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{e.subject ?? 'Period'}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant === 'teacher' ? `${e.className ?? ''} ${e.section ?? ''}`.trim() : (e.teacher ?? 'Unassigned')}
                      {e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
