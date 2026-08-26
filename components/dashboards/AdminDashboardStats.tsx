'use client';

import { GraduationCap, Layers, Wallet, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import type { FeesSummary } from '@/store/api/feesApi';

/** Stats row — always real, even at zero. */
export function AdminDashboardStats({
  totalStudents,
  newThisMonth,
  classesLoading,
  classCount,
  totalSections,
  fees,
}: {
  totalStudents: string;
  newThisMonth?: number;
  classesLoading: boolean;
  classCount: number;
  totalSections: number;
  fees: FeesSummary | undefined;
}) {
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
        label="Classes & Sections"
        value={classesLoading ? '…' : classCount.toLocaleString('en-PK')}
        icon={Layers}
        tone="success"
        delta={!classesLoading ? `${totalSections} section${totalSections === 1 ? '' : 's'}` : undefined}
      />
      <StatCard
        label="Fees Collected"
        value={fees ? formatCurrency(fees.collectedThisMonth) : '—'}
        icon={Wallet}
        tone="info"
      />
      <StatCard
        label="Outstanding Fees"
        value={fees ? formatCurrency(fees.outstanding) : '—'}
        icon={Clock}
        tone="warning"
      />
    </div>
  );
}
