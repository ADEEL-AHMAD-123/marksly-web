'use client';

import { useMemo } from 'react';
import { CalendarClock, Clock, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TimetableEntry, useMyTeacherTimetableQuery, useMyStudentTimetableQuery } from '@/store/api/timetableApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function MyTimetableView({ role }: { role: 'teacher' | 'student' }) {
  const teacherQ = useMyTeacherTimetableQuery(undefined, { skip: role !== 'teacher' });
  const studentQ = useMyStudentTimetableQuery(undefined, { skip: role !== 'student' });
  const res = role === 'teacher' ? teacherQ : studentQ;
  const entries: TimetableEntry[] = res.data?.data ?? [];
  const today = new Date().getDay();
  // Only worth labelling entries by term when this teacher/student's
  // fetched entries genuinely span more than one distinct term at once
  // (concurrently-active terms) — a single-term schedule (the common case)
  // stays exactly as clean as before.
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

  return (
    <div className="space-y-6">
      <PageHeader title="Timetable" description="Your weekly class schedule." />
      {res.isLoading ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : entries.length === 0 ? (
        <Card><EmptyState icon={CalendarClock} title="No schedule yet" description="Your timetable will appear here once it has been set up." /></Card>
      ) : (
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
                      <p className="mt-1 text-sm font-medium text-foreground">{e.subject ?? 'Class'}</p>
                      <p className="text-xs text-muted-foreground">
                        {role === 'teacher' ? `${e.className ?? ''} ${e.section ?? ''}`.trim() : (e.teacher ?? 'Unassigned')}
                        {e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
