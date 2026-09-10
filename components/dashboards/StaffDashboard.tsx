'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { useAppSelector } from '@/store/hooks';
import { useGetStudentStatsQuery } from '@/store/api/studentsApi';
import { useGetAttendanceCoverageTodayQuery } from '@/store/api/attendanceApi';
import { useGetFeesSummaryQuery } from '@/store/api/feesApi';
import { AdminDashboardStats } from '@/components/dashboards/AdminDashboardStats';
import { TodaysAttendanceCard } from '@/components/dashboards/AdminDashboardAttendance';
import { DashboardAlertBanner } from '@/components/dashboards/DashboardAlertBanner';
import { DashboardNoticeBanner } from '@/components/dashboards/DashboardNoticeBanner';
import { DashboardIdCardNudge } from '@/components/dashboards/DashboardIdCardNudge';
import { StaffDashboardQuickActions } from '@/components/dashboards/StaffDashboardQuickActions';
import { DashboardSchoolCard } from '@/components/dashboards/DashboardSchoolCard';
import { DashboardNotices } from '@/components/dashboards/DashboardNotices';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Staff (non-teaching institution staff) landing page — previously staff
 * had no dashboard of its own at all, it just rendered AdminDashboard
 * verbatim: an onboarding checklist full of admin-only setup steps
 * (institution logo, academic year, teachers, fee structures — none of
 * which staff can write to), a "Record a payment"/"Mark attendance" quick
 * actions list staff has no backend access to act on, and a Reports-based
 * fee chart staff can't even read (report.routes.ts is admin+accountant
 * only). This is a dedicated build around what staff actually has real
 * backend access to: read-only across students/classes/attendance/fees,
 * plus full write access to Notices (its one genuine write capability —
 * see notification.routes.ts's canManage) — see nav-items.ts's `staff`
 * array and the per-page RoleGuard layouts under app/(dashboard)/admin/
 * for the matching route-level lockout.
 *
 * Deliberately reuses the same shared Dashboard* widgets the teacher
 * dashboard uses (DashboardNoticeBanner/DashboardSchoolCard/
 * DashboardNotices/DashboardIdCardNudge) rather than forking new copies —
 * and AdminDashboardStats/TodaysAttendanceCard from the admin dashboard,
 * with TodaysAttendanceCard's `readOnly` prop swapping its "Mark
 * attendance" button for a "View attendance" one so this never implies an
 * action staff can't actually take.
 */
export function StaffDashboard() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const { data: statsRes, isLoading: statsLoading } = useGetStudentStatsQuery();
  const stats = statsRes?.data;
  const totalStudents = statsLoading ? '…' : (stats?.total ?? 0).toLocaleString('en-PK');

  const { data: coverageRes, isLoading: coverageLoading } = useGetAttendanceCoverageTodayQuery();
  const coverage = coverageRes?.data;

  const { data: feeRes } = useGetFeesSummaryQuery();
  const fees = feeRes?.data;

  return (
    <div className="space-y-6">
      <DashboardAlertBanner />
      <DashboardNoticeBanner noticesHref="/admin/notices" />

      <PageHeader
        title={`${greeting()}${user?.firstName ? `, ${user.firstName}` : ''}`}
        description="Here's what's happening at your institution today."
      />

      <DashboardIdCardNudge />

      <AdminDashboardStats
        totalStudents={totalStudents}
        newThisMonth={stats?.newThisMonth}
        coverage={coverage}
        coverageLoading={coverageLoading}
        fees={fees}
        onMarkAttendance={() => router.push('/admin/attendance')}
      />

      <StaffDashboardQuickActions />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <TodaysAttendanceCard
            coverage={coverage}
            loading={coverageLoading}
            onMarkAttendance={() => router.push('/admin/attendance')}
            readOnly
          />
        </div>
        <div className="space-y-6">
          <DashboardSchoolCard />
          <DashboardNotices noticesHref="/admin/notices" />
        </div>
      </div>
    </div>
  );
}
