'use client';

import { CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyTeacherTimetableQuery } from '@/store/api/timetableApi';

const WEEKDAYS = [
  { dayOfWeek: 1, label: 'Mon' },
  { dayOfWeek: 2, label: 'Tue' },
  { dayOfWeek: 3, label: 'Wed' },
  { dayOfWeek: 4, label: 'Thu' },
  { dayOfWeek: 5, label: 'Fri' },
];

/**
 * A week-at-a-glance strip — period counts per weekday, derived client-side
 * from the teacher's full timetable (myTeacherTimetable already returns
 * every entry across the week, not just today, so no new endpoint needed).
 * Purely a "how busy is each day" glance with a link to the real timetable
 * page for the actual schedule — not a replacement for TeacherDashboardToday.
 */
export function TeacherDashboardWeekStrip() {
  const { data, isLoading } = useMyTeacherTimetableQuery();
  const entries = data?.data ?? [];

  if (isLoading) return <Card className="p-5"><Skeleton className="h-20 w-full" /></Card>;
  if (entries.length === 0) return null;

  const todayDow = new Date().getDay();
  const counts = WEEKDAYS.map(({ dayOfWeek, label }) => ({
    label,
    dayOfWeek,
    count: entries.filter((e) => e.dayOfWeek === dayOfWeek).length,
  }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarRange size={18} /> This week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {counts.map(({ label, dayOfWeek, count }) => {
            const isToday = dayOfWeek === todayDow;
            return (
              <div
                key={label}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg p-2.5',
                  isToday ? 'bg-primary-soft' : 'bg-muted/50'
                )}
              >
                <p className={cn('text-xs', isToday ? 'font-semibold text-primary-soft-foreground' : 'text-muted-foreground')}>{label}</p>
                <p className={cn('text-sm font-semibold', isToday ? 'text-primary-soft-foreground' : 'text-foreground')}>{count}</p>
                <div className="h-1 w-full overflow-hidden rounded-full bg-card">
                  <div
                    className={cn('h-full rounded-full', isToday ? 'bg-primary' : 'bg-border')}
                    style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
