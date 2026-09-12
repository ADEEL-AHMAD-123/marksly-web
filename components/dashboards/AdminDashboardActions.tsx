'use client';

import Link from 'next/link';
import { Wallet, CalendarCheck, DollarSign, Megaphone, ArrowRight, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { AreaTrendChart } from '@/components/charts/charts';
import type { ReportsData } from '@/store/api/reportsApi';

/** Fee Collection — real data from the reports API. */
export function FeeCollectionCard({ reports }: { reports: ReportsData | undefined }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Fee Collection</CardTitle>
            <CardDescription>Monthly collected amount, last 6 months</CardDescription>
          </div>
          <Link href="/admin/fees" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
            View Fees <ArrowRight size={12} />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {reports?.feeCollection?.some((m) => m.amount > 0) ? (
          <AreaTrendChart data={reports.feeCollection} xKey="label" yKey="amount" />
        ) : (
          <EmptyState
            icon={Wallet}
            title="No payments recorded yet"
            description="Once fee payments come in, this chart will fill in automatically."
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Quick actions — always accurate, never fabricated. Attendance is marked
 * by teachers now, not admins (see AttendanceView's admin-override
 * rework), so this card no longer offers to "mark" it — it links into the
 * Attendance Report instead, which is what /admin/attendance actually
 * opens on for an admin. State-aware: once today's attendance is fully
 * marked, swapping that link for a fresh suggestion instead of nagging
 * about something already done.
 */
export function QuickActionsCard({ attendanceFullyMarked = false }: { attendanceFullyMarked?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common things you might do next</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {attendanceFullyMarked ? (
            <Link
              href="/admin/staff"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              <Users size={18} className="shrink-0" /> Manage staff
            </Link>
          ) : (
            <Link
              href="/admin/attendance"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              <CalendarCheck size={18} className="shrink-0" /> Review attendance
            </Link>
          )}
          <Link
            href="/admin/fees"
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            <DollarSign size={18} className="shrink-0" /> Record a payment
          </Link>
          <Link
            href="/admin/notices"
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            <Megaphone size={18} className="shrink-0" /> Post a notice
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
