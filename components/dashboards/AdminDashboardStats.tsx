'use client';

import { GraduationCap, CalendarCheck, Wallet, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import type { FeesSummary } from '@/store/api/feesApi';
import type { AttendanceCoverage } from '@/store/api/attendanceApi';

/** Stats row — always real, even at zero.
 *
 *  Previously led with "Classes & Sections" (a slow-moving setup number —
 *  useful once, ignorable every day after) and "Outstanding Fees" (a
 *  number that barely moves day to day and mostly just restates something
 *  the Fees page already tracks in detail). An admin opening this dashboard
 *  daily is really asking one thing: "did today happen correctly?" — so
 *  this row now leads with two live "today" signals (attendance coverage,
 *  fees collected today) instead of two static setup/balance numbers.
 *  Classes & Sections is still tracked — via the onboarding checklist while
 *  setup is in progress — it just isn't a top-line daily stat anymore. */
export function AdminDashboardStats({
  totalStudents,
  newThisMonth,
  coverage,
  coverageLoading,
  fees,
  onMarkAttendance,
}: {
  totalStudents: string;
  newThisMonth?: number;
  coverage: AttendanceCoverage | undefined;
  coverageLoading: boolean;
  fees: FeesSummary | undefined;
  onMarkAttendance: () => void;
}) {
  const totalSections = coverage?.totalSections ?? 0;
  const markedSections = coverage?.markedSections ?? 0;
  const attendanceReady = totalSections > 0;
  const allMarked = attendanceReady && markedSections === totalSections;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Total Students"
        value={totalStudents}
        icon={GraduationCap}
        tone="primary"
        delta={newThisMonth ? `${newThisMonth} new` : undefined}
      />
      <StatCard
        label="Today's Attendance"
        value={coverageLoading ? '…' : attendanceReady ? `${markedSections}/${totalSections}` : '—'}
        icon={CalendarCheck}
        tone={allMarked ? 'success' : attendanceReady ? 'warning' : 'success'}
        delta={
          coverageLoading
            ? undefined
            : attendanceReady
              ? allMarked ? 'All marked' : 'Needs marking'
              : 'No sections yet'
        }
        deltaTone={coverageLoading ? undefined : allMarked ? 'success' : attendanceReady ? 'warning' : 'muted'}
        onClick={attendanceReady ? onMarkAttendance : undefined}
      />
      <StatCard
        label="Fees Collected"
        value={fees ? formatCurrency(fees.collectedThisMonth) : '—'}
        icon={Wallet}
        tone="info"
        delta="this month"
        deltaTone="muted"
      />
      <StatCard
        label="Collected Today"
        value={fees ? formatCurrency(fees.collectedToday) : '—'}
        icon={TrendingUp}
        tone={fees && fees.collectedToday > 0 ? 'success' : 'primary'}
        delta={fees?.paymentsToday ? `${fees.paymentsToday} payment${fees.paymentsToday === 1 ? '' : 's'}` : 'No payments yet'}
        deltaTone={fees && fees.collectedToday > 0 ? 'success' : 'muted'}
      />
    </div>
  );
}
