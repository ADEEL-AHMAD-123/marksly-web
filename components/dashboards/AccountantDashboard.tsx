'use client';

import Link from 'next/link';
import { Wallet, Clock, FileText, ArrowRight, AlertTriangle, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button-variants';
import { useGetFeesSummaryQuery, useGetInvoicesQuery } from '@/store/api/feesApi';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { DashboardNoticeBanner } from '@/components/dashboards/DashboardNoticeBanner';
import { DashboardNotices } from '@/components/dashboards/DashboardNotices';
import { DashboardSchoolCard } from '@/components/dashboards/DashboardSchoolCard';

const statusBadge = {
  paid: { variant: 'success' as const, label: 'Paid' },
  partial: { variant: 'primary' as const, label: 'Partial' },
  pending: { variant: 'warning' as const, label: 'Pending' },
  overdue: { variant: 'danger' as const, label: 'Overdue' },
  waived: { variant: 'neutral' as const, label: 'Waived' },
};
// Defensive fallback -- same guard as InvoicesTab.tsx/FeesList.tsx.
const statusBadgeFor = (status: keyof typeof statusBadge) => statusBadge[status] ?? statusBadge.pending;

/** Accountant's own landing page — a financial-only overview (collections,
 *  dues, and the invoices most in need of follow-up) rather than the
 *  full-institution admin dashboard. Every query here already permits the
 *  'accountant' role on the backend, so this is purely a role-scoped
 *  presentation on top of existing endpoints — no backend changes needed. */
export function AccountantDashboard() {
  const { data: sumRes, isLoading: sumLoading } = useGetFeesSummaryQuery();
  const { data: overdueRes, isLoading: overdueLoading } = useGetInvoicesQuery({ status: 'overdue', limit: 6 });

  const s = sumRes?.data;
  const overdue = overdueRes?.data ?? [];

  return (
    <div className="space-y-6">
      <DashboardNoticeBanner noticesHref="/accountant/notices" />

      <PageHeader
        title="Accountant Dashboard"
        description="Fee collection and dues at a glance."
        actions={
          <>
            <Link href="/accountant/messaging" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <MessageSquare size={15} /> Send reminders
            </Link>
            <Link href="/accountant/fees" className={buttonVariants({ size: 'sm' })}>
              Go to Fees & Payments <ArrowRight size={15} />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Collected this month"
          value={sumLoading || !s ? '—' : formatCurrency(s.collectedThisMonth)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={sumLoading || !s ? '—' : formatCurrency(s.outstanding)}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Pending invoices"
          value={sumLoading || !s ? '—' : s.pendingInvoices.toLocaleString('en-PK')}
          icon={FileText}
          tone="primary"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger" /> Needs follow-up — overdue invoices
          </CardTitle>
          <Link href="/accountant/fees" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {overdueLoading ? (
            <div className="p-5"><Skeleton className="h-40 w-full" /></div>
          ) : overdue.length === 0 ? (
            <EmptyState icon={FileText} title="No overdue invoices" description="Every invoice is either paid or not yet due — nothing needs chasing right now." />
          ) : (
            <ul className="divide-y divide-border">
              {overdue.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {inv.studentName} {inv.rollNumber ? <span className="text-muted-foreground">· {inv.rollNumber}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.structureName ?? 'Fee'} · Due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.balance)}</p>
                      <Badge variant={statusBadgeFor(inv.status).variant} className={cn('mt-0.5')}>
                        {statusBadgeFor(inv.status).label}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSchoolCard />
        <DashboardNotices noticesHref="/accountant/notices" />
      </div>
    </div>
  );
}
