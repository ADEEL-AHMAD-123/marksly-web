'use client';

import { Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useGetMyPayoutsQuery, useGetMyOwedQuery, type PayoutStatus } from '@/store/api/feesOnlineApi';

const statusBadge: Record<PayoutStatus, { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }> = {
  pending: { variant: 'primary', label: 'On the way' },
  held_unverified_account: { variant: 'warning', label: 'Held — verify payout account' },
  paid: { variant: 'success', label: 'Paid' },
  failed: { variant: 'danger', label: 'Failed' },
};

export function MyPayoutsTab() {
  const { data: owedRes, isLoading: owedLoading } = useGetMyOwedQuery();
  const { data: payoutsRes, isLoading: payoutsLoading } = useGetMyPayoutsQuery();
  const owed = owedRes?.data;
  const payouts = payoutsRes?.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Money collected online from parents (via JazzCash/EasyPaisa/Safepay) that Marksly owes back to you, minus the agreed platform fee.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Collected, not yet paid out"
          value={owedLoading ? '—' : formatCurrency(owed?.gross ?? 0)}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Pending refund clawback"
          value={owedLoading ? '—' : formatCurrency(owed?.pendingClawback ?? 0)}
          icon={Wallet}
          tone={owed?.pendingClawback ? 'danger' : 'success'}
        />
      </div>

      <Card className="p-5">
        <p className="mb-3 font-semibold text-foreground">Payout history</p>
        {payoutsLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : payouts.length === 0 ? (
          <EmptyState icon={Wallet} title="No payouts yet" description="Once you have online fee payments, they'll be batched into a payout here." />
        ) : (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Platform fee</TableHead>
                  <TableHead>Clawback</TableHead>
                  <TableHead>Net paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(p.grossCollected)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(p.platformFee)}</TableCell>
                    <TableCell className={p.clawbackAmount > 0 ? 'text-danger' : 'text-muted-foreground'}>
                      {p.clawbackAmount > 0 ? `− ${formatCurrency(p.clawbackAmount)}` : '—'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(p.netAmount)}</TableCell>
                    <TableCell><Badge variant={statusBadge[p.status].variant}>{statusBadge[p.status].label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>
    </div>
  );
}
