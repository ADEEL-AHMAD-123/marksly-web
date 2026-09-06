'use client';

import { CalendarClock, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyStudentTimetableQuery } from '@/store/api/timetableApi';

function isNowWithin(startTime: string, endTime: string): boolean {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return mins >= toMins(startTime) && mins < toMins(endTime);
}

/** Read-only counterpart to TeacherDashboardToday — same "today's schedule
 *  in order" idea, minus the attendance-marking action (that's the
 *  teacher's job, not the student's). */
export function StudentDashboardToday() {
  const { data, isLoading } = useMyStudentTimetableQuery();
  const all = data?.data ?? [];
  const todayDow = new Date().getDay();
  const today = all.filter((e) => e.dayOfWeek === todayDow).sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (isLoading) return <Card className="p-5"><Skeleton className="h-32 w-full" /></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarClock size={18} /> Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {today.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <PartyPopper className="shrink-0 text-muted-foreground" size={20} />
            <p className="text-sm text-muted-foreground">No periods scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {today.map((p) => {
              const now = isNowWithin(p.startTime, p.endTime);
              return (
                <div
                  key={p.id}
                  className={cn('flex items-center gap-3 rounded-xl border p-3', now ? 'border-primary/30 bg-primary-soft' : 'border-border')}
                >
                  <div className="w-16 shrink-0 text-xs font-semibold text-foreground">
                    {p.startTime}
                    <div className="font-normal text-muted-foreground">{p.endTime}</div>
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{p.subject ?? 'Period'}</p>
                  {p.room && <p className="shrink-0 text-xs text-muted-foreground">Room {p.room}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
