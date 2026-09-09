'use client';

import Link from 'next/link';
import { CalendarCheck, Wallet, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useChildFeesQuery, useChildResultsQuery, type ChildSummary } from '@/store/api/portalApi';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

const LOW_ATTENDANCE_THRESHOLD = 75;

/**
 * Extracted from ParentDashboardView so each card can carry its own
 * per-child queries (next due invoice, latest result) without every other
 * child's card re-rendering or over-fetching. Previously this card only
 * showed the two numbers already present on ChildSummary (attendance rate,
 * total fees due) — useful as a glance, but a parent had to click through
 * to "My Children" to find out WHEN the next payment is due or WHAT the
 * most recent result was, both of which are exactly the kind of thing a
 * parent opens this dashboard to check.
 */
export function ParentDashboardChildCard({ child }: { child: ChildSummary }) {
  const { data: feesRes } = useChildFeesQuery(child.id);
  const fees = feesRes?.data ?? [];
  const nextDue = fees
    .filter((f) => f.status !== 'paid')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const { data: resultsRes } = useChildResultsQuery(child.id);
  const latestResult = (resultsRes?.data ?? [])[0];

  const lowAttendance = child.attendanceRate < LOW_ATTENDANCE_THRESHOLD;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Avatar
            photoUrl={child.profilePhoto}
            alt={child.name}
            initials={getInitials(child.name.split(' ')[0] || '', child.name.split(' ').slice(1).join(' ') || '')}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{child.name}</p>
            <p className="text-sm text-muted-foreground">{child.rollNumber}{child.className ? ` · ${child.className}` : ''}</p>
          </div>
          <Badge variant={child.feesDue > 0 ? 'warning' : 'success'}>
            {child.feesDue > 0 ? 'Fees Pending' : 'Fees Paid'}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 ${lowAttendance ? 'bg-danger-soft' : 'bg-muted'}`}>
            <p className={`flex items-center gap-1.5 text-xs ${lowAttendance ? 'text-danger' : 'text-muted-foreground'}`}>
              <CalendarCheck size={13} /> Attendance
            </p>
            <p className={`mt-1 text-lg font-bold ${lowAttendance ? 'text-danger' : 'text-foreground'}`}>{child.attendanceRate}%</p>
            {lowAttendance && <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-danger"><AlertTriangle size={11} /> Needs attention</p>}
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet size={13} /> Fees due
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(child.feesDue)}</p>
          </div>
        </div>

        {(nextDue || latestResult) && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {nextDue && (
              <p className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet size={12} /> Next due</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(nextDue.balance)} · {nextDue.status === 'overdue' ? 'was due' : 'due'} {formatDate(nextDue.dueDate)}
                </span>
              </p>
            )}
            {latestResult && (
              <p className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><FileText size={12} /> Latest result</span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {latestResult.examTitle} · {latestResult.percentage}%
                  <Badge variant={latestResult.isPassed ? 'primary' : 'danger'} className="ml-0.5">{latestResult.grade}</Badge>
                </span>
              </p>
            )}
          </div>
        )}

        <Link href="/parent/children">
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-between">
            View details <ChevronRight size={16} />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
