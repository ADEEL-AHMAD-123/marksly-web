'use client';

import { useMemo } from 'react';
import { CalendarClock, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TimetableEntry } from '@/store/api/timetableApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Shared read-only weekly grid used by a teacher's own timetable, a
 * student's own timetable, and a parent viewing their child's timetable —
 * same day-by-day card layout, only the subtitle line under each period
 * differs (a teacher cares which class/section; a student or parent cares
 * who's teaching it).
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {DAYS.map((day, idx) => {
        const periods = byDay[idx] ?? [];
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
  );
}
