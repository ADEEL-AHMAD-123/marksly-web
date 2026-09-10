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
import { formatCurrency } from '@/lib/utils';
import { StudentDashboardIdCardNudge } from '@/components/dashboards/StudentDashboardIdCardNudge';
import { StudentDashboardToday } from '@/components/dashboards/StudentDashboardToday';
import { StudentDashboardExamsNudge } from '@/components/dashboards/StudentDashboardExamsNudge';
import { StudentDashboardFeesNudge } from '@/components/dashboards/StudentDashboardFeesNudge';
import { StudentDashboardAcademicsSnapshot } from '@/components/dashboards/StudentDashboardAcademicsSnapshot';
import { StudentDashboardEmptyState } from '@/components/dashboards/StudentDashboardEmptyState';
import { DashboardNoticeBanner } from '@/components/dashboards/DashboardNoticeBanner';
import { DashboardNotices } from '@/components/dashboards/DashboardNotices';
import { DashboardSchoolCard } from '@/components/dashboards/DashboardSchoolCard';

// This page used to render entirely hardcoded, fabricated data (a fixed
// "Ali Khan"-style results table, a fake "94%" attendance figure, invented
// notices) with no API calls at all — every student saw the exact same
// invented numbers regardless of their real school records. Rewritten to
// pull everything from the real portal endpoints, then later extended with
// today's schedule, an online-exam nudge and an ID-card nudge.
//
// Now brought in line with the teacher/staff dashboard pattern: an
// urgent/high notice banner up top (DashboardNoticeBanner), a task/context
// two-column split on larger screens (schedule/academics/nudges on the
// wider left, results/notices/school info on the narrower right), and the
// shared DashboardNotices/DashboardSchoolCard widgets instead of a
// one-off inline notices card — same visual language wherever a student
// or any other role lands after logging in.
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

      <DashboardNoticeBanner noticesHref="/student/notices" />
      {/* Live/upcoming/missed online exams — deliberately rendered above
          everything else (even the empty-state/loading branches below) so
          a student sees this the moment they land here, not buried after
          scrolling past attendance/fees/academics. */}
      <StudentDashboardExamsNudge />
      <StudentDashboardIdCardNudge />

      {structuralLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : isEmpty ? (
        <StudentDashboardEmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
              tone={feesDue > 0 ? 'warning' : 'success'}
            />
            <StatCard
              label="Notices"
              value={noticesLoading ? '…' : String(notices.length)}
              icon={Bell}
              tone="primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <StudentDashboardToday />
              <StudentDashboardAcademicsSnapshot />
              <StudentDashboardFeesNudge />

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
                          <Badge variant={r.isPassed ? 'success' : 'danger'}>{r.grade}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <DashboardSchoolCard />
              <DashboardNotices noticesHref="/student/notices" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
