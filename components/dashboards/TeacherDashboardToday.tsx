'use client';

import Link from 'next/link';
import { Clock, CalendarClock, CheckCircle2, ArrowRight, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGetMyPeriodsQuery, type MyPeriod } from '@/store/api/attendanceApi';

/** Is `hhmm` (e.g. "13:45") the period straddling right now? Used only to
 *  highlight one row visually — never gates any action, since a teacher may
 *  legitimately want to mark a past period's attendance late. */
function isNowWithin(startTime: string, endTime: string): boolean {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return mins >= toMins(startTime) && mins < toMins(endTime);
}

function PeriodRow({ period }: { period: MyPeriod }) {
  const now = isNowWithin(period.startTime, period.endTime);
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3.5 transition-colors',
        now ? 'border-primary/30 bg-primary-soft' : 'border-border'
      )}
    >
      <div className="w-16 shrink-0 text-xs font-semibold text-foreground">
        {period.startTime}
        <div className="font-normal text-muted-foreground">{period.endTime}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {period.subject ?? 'Period'} — {period.className} {period.sectionName}
        </p>
        {period.marked ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {period.present} present · {period.absent} absent
            {period.late ? ` · ${period.late} late` : ''}
            {period.leave ? ` · ${period.leave} leave` : ''}
          </p>
        ) : now ? (
          <p className="mt-0.5 text-xs font-medium text-primary">Happening now — attendance not marked yet</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">Attendance not marked yet</p>
        )}
      </div>
      {period.marked ? (
        <Badge variant="success" className="shrink-0 gap-1"><CheckCircle2 size={12} /> Marked</Badge>
      ) : (
        <Link
          href={`/teacher/attendance?period=${period.periodId}`}
          className={cn(buttonVariants({ size: 'sm', variant: now ? 'primary' : 'outline' }), 'shrink-0')}
        >
          Mark <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

/**
 * Replaces the old TeachNowCard as the teacher dashboard's centerpiece —
 * built on getMyPeriods (not teachNow) specifically because it already
 * carries per-period attendance-marked status alongside the schedule, so
 * this single card does double duty as "today's timetable" AND "what still
 * needs attendance marked" instead of being two separate, thinner widgets.
 */
export function TeacherDashboardToday() {
  const { data, isLoading } = useGetMyPeriodsQuery();
  const periods = data?.data ?? [];

  if (isLoading) return <Card className="p-5"><Skeleton className="h-40 w-full" /></Card>;

  const unmarked = periods.filter((p) => !p.marked);

  if (periods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock size={18} /> Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <PartyPopper className="shrink-0 text-muted-foreground" size={20} />
            <p className="text-sm text-muted-foreground">No periods scheduled for you today — enjoy the free day.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><CalendarClock size={18} /> Today</CardTitle>
          {unmarked.length > 0 ? (
            <Badge variant="warning" className="gap-1"><Clock size={12} /> {unmarked.length} need{unmarked.length === 1 ? 's' : ''} attendance</Badge>
          ) : (
            <Badge variant="success" className="gap-1"><CheckCircle2 size={12} /> All marked</Badge>
          )}
        </div>
        <CardDescription>Your periods for today, in order.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {periods.map((p) => <PeriodRow key={p.periodId} period={p} />)}
      </CardContent>
    </Card>
  );
}
