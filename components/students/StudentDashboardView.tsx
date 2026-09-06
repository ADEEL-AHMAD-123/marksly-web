'use client';

import { CalendarCheck, FileText, Wallet, Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyAttendanceQuery, useMyResultsQuery, useMyFeesQuery } from '@/store/api/portalApi';
import { useMyStudentTimetableQuery } from '@/store/api/timetableApi';
import { useGetNoticesQuery } from '@/store/api/noticesApi';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StudentDashboardIdCardNudge } from '@/components/dashboards/StudentDashboardIdCardNudge';
import { StudentDashboardToday } from '@/components/dashboards/StudentDashboardToday';
import { StudentDashboardExamsNudge } from '@/components/dashboards/StudentDashboardExamsNudge';
import { StudentDashboardEmptyState } from '@/components/dashboards/StudentDashboardEmptyState';

// This page used to render entirely hardcoded, fabricated data (a fixed
// "Ali Khan"-style results table, a fake "94%" attendance figure, invented
// notices) with no API calls at all — every student saw the exact same
// invented numbers regardless of their real school records. Rewritten to
// pull everything from the real portal endpoints (already existed and
// worked, just weren't wired up here) so this actually reflects each
// student's own data. Later extended with today's schedule, an online-exam
// nudge and an ID-card nudge — same treatment given to the teacher
// dashboard — plus a real empty state for when nothing's set up for their
// class yet, instead of five simultaneous "no data" placeholder cards.
export function StudentDashboardView() {
  const { data: attRes, isLoading: attLoading } = useMyAttendanceQuery();
  const attendance = attRes?.data;

  const { data: resultsRes, isLoading: resultsLoading } = useMyResultsQuery();
  const results = resultsRes?.data ?? [];

  const { data: feesRes, isLoading: feesLoading } = useMyFeesQuery();
  const fees = feesRes?.data ?? [];
  const feesDue = fees.reduce((sum, f) => sum + (f.status === 'paid' ? 0 : f.balance), 0);

  const { data: noticesRes, isLoading: noticesLoading } = useGetNoticesQuery({ limit: 5 });
  const notices = noticesRes?.data ?? [];

  const { data: timetableRes, isLoading: timetableLoading } = useMyStudentTimetableQuery();
  const timetable = timetableRes?.data ?? [];

  const loading = attLoading || resultsLoading || feesLoading || noticesLoading;
  const structuralLoading = loading || timetableLoading;

  // Nothing set up for this student's class yet — no timetable, no
  // attendance history, no results. Fees are deliberately excluded from
  // this check: a student can have zero fee records simply because no fee
  // structure applies to them, which isn't a "nothing's set up" signal.
  const isEmpty = !structuralLoading && timetable.length === 0 && (attendance?.total ?? 0) === 0 && results.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="My Dashboard" description="Track your attendance, results and fees." />

      <StudentDashboardIdCardNudge />

      {structuralLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : isEmpty ? (
        <StudentDashboardEmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Attendance"
              value={attLoading ? '…' : attendance?.total ? `${attendance.rate}%` : '—'}
              icon={CalendarCheck}
              tone="success"
            />
            <StatCard
              label="Fees Due"
              value={feesLoading ? '…' : formatCurrency(feesDue)}
              icon={Wallet}
              tone={feesDue > 0 ? 'warning' : 'info'}
            />
            <StatCard
              label="Notices"
              value={noticesLoading ? '…' : String(notices.length)}
              icon={Bell}
              tone="primary"
            />
          </div>

          <StudentDashboardToday />
          <StudentDashboardExamsNudge />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                <CardDescription>Your most recent exams</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : results.length === 0 ? (
                  <EmptyState icon={FileText} title="No results yet" description="Results will show up here once they're published." />
                ) : (
                  <ul className="divide-y divide-border">
                    {results.slice(0, 5).map((r, i) => (
                      <li key={`${r.examTitle}-${i}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{r.examTitle}</p>
                          <p className="text-xs text-muted-foreground">{r.totalObtained} / {r.totalMarks} ({r.percentage}%)</p>
                        </div>
                        <Badge variant={r.isPassed ? 'primary' : 'danger'}>{r.grade}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notices</CardTitle>
                <CardDescription>From your institution</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : notices.length === 0 ? (
                  <EmptyState icon={Bell} title="No notices" description="You're all caught up." />
                ) : (
                  <ul className="space-y-3">
                    {notices.map((n) => (
                      <li key={n.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <Bell size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(n.publishedAt)}</p>
                        </div>
                        {(n.priority === 'high' || n.priority === 'urgent') && <Badge variant="danger">Important</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
