'use client';

import Link from 'next/link';
import { ArrowRight, Users, Wallet, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoNote } from '@/components/ui/info-note';
import { useMyChildrenQuery } from '@/store/api/portalApi';
import { formatCurrency } from '@/lib/utils';
import { ParentDashboardChildCard } from '@/components/portal/ParentDashboardChildCard';
import { ParentDashboardEmptyState } from '@/components/dashboards/ParentDashboardEmptyState';
import { DashboardNoticeBanner } from '@/components/dashboards/DashboardNoticeBanner';
import { DashboardNotices } from '@/components/dashboards/DashboardNotices';
import { DashboardSchoolCard } from '@/components/dashboards/DashboardSchoolCard';

const LOW_ATTENDANCE_THRESHOLD = 75;

// Previously this page showed two entirely invented children ("Ali Khan",
// "Sara Khan") with hardcoded attendance/fee numbers and a "View details"
// button that didn't even navigate anywhere. Rewritten to use the real
// `useMyChildrenQuery()` data, then brought in line with the rest of the
// dashboard family: an urgent/high notice banner up top, a real aggregate
// stat row (children count / total fees due / children needing attention)
// instead of jumping straight to the child cards, a dedicated empty state
// for zero linked children (previously a single generic line), and the
// shared DashboardNotices/DashboardSchoolCard widgets.
export function ParentDashboardView() {
  const { data, isLoading } = useMyChildrenQuery();
  const children = data?.data ?? [];
  const totalFeesDue = children.reduce((sum, c) => sum + c.feesDue, 0);
  const lowAttendanceCount = children.filter((c) => c.attendanceRate < LOW_ATTENDANCE_THRESHOLD).length;

  return (
    <div className="space-y-6">
      <DashboardNoticeBanner noticesHref="/parent/notices" />

      <PageHeader
        title="Parent Portal"
        description="Stay updated on your children's progress."
        actions={
          totalFeesDue > 0 ? (
            <Link href="/parent/fees" className={buttonVariants({ size: 'sm' })}>
              <Wallet size={16} /> Pay Fees
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : children.length === 0 ? (
        <ParentDashboardEmptyState />
      ) : (
        <>
          <InfoNote title="What can I do here?">
            <p>
              This page is a quick summary — for the full picture on any one child, use{' '}
              <strong>My Children</strong> below or the links here.
            </p>
            <p>
              Check day-to-day <strong>attendance</strong>, term <strong>results</strong> once published, and any{' '}
              <strong>fees</strong> due. Fees can be paid directly from the Fees page.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <Link href="/parent/children" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                My Children <ArrowRight size={12} />
              </Link>
              <Link href="/parent/attendance" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Attendance <ArrowRight size={12} />
              </Link>
              <Link href="/parent/results" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Results <ArrowRight size={12} />
              </Link>
              <Link href="/parent/fees" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Fees <ArrowRight size={12} />
              </Link>
            </div>
          </InfoNote>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Children" value={String(children.length)} icon={Users} tone="primary" />
            <StatCard
              label="Fees Due"
              value={formatCurrency(totalFeesDue)}
              icon={Wallet}
              tone={totalFeesDue > 0 ? 'warning' : 'info'}
            />
            <StatCard
              label="Needs Attention"
              value={String(lowAttendanceCount)}
              icon={AlertTriangle}
              tone={lowAttendanceCount > 0 ? 'danger' : 'success'}
              delta={lowAttendanceCount > 0 ? 'Low attendance' : 'All good'}
              deltaTone={lowAttendanceCount > 0 ? 'warning' : 'success'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {children.map((c) => <ParentDashboardChildCard key={c.id} child={c} />)}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardSchoolCard />
            <DashboardNotices noticesHref="/parent/notices" />
          </div>
        </>
      )}
    </div>
  );
}
