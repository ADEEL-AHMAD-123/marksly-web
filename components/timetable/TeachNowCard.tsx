'use client';

import Link from 'next/link';
import { Clock, CalendarClock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeachNowQuery } from '@/store/api/timetableApi';

export function TeachNowCard() {
  const { data, isLoading } = useTeachNowQuery();
  const d = data?.data;

  if (isLoading || !d) return <Card className="p-5"><Skeleton className="h-28 w-full" /></Card>;

  const active = d.current;
  const upcoming = d.next;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarClock size={18} /> Teaching now</CardTitle>
        <CardDescription>Your schedule for today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
            <div className="flex items-center justify-between">
              <Badge variant="primary" className="gap-1"><Clock size={12} /> Now · {active.startTime}–{active.endTime}</Badge>
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{active.subject ?? 'Period'} — {active.className} {active.section}</p>
            {active.room && <p className="text-sm text-muted-foreground">Room {active.room}</p>}
            <Link href={`/teacher/attendance?period=${active.id}`} className={`${buttonVariants({ size: 'sm' })} mt-3`}>
              Mark attendance <ArrowRight size={15} />
            </Link>
          </div>
        ) : upcoming ? (
          <div className="rounded-xl border border-border p-4">
            <Badge variant="neutral" className="gap-1"><Clock size={12} /> Next · {upcoming.startTime}</Badge>
            <p className="mt-2 font-medium text-foreground">{upcoming.subject ?? 'Period'} — {upcoming.className} {upcoming.section}</p>
          </div>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">No more classes scheduled today.</p>
        )}

        {d.today.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
            <ul className="divide-y divide-border">
              {d.today.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="w-24 shrink-0 text-xs font-medium text-foreground">{e.startTime}–{e.endTime}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{e.subject ?? 'Period'} · {e.className} {e.section}</span>
                  {e.room && <span className="text-xs text-muted-foreground">Room {e.room}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
