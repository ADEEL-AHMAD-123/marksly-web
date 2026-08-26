'use client';

import { Wallet, Clock, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetFeesSummaryQuery } from '@/store/api/feesApi';
import { formatCurrency } from '@/lib/utils';
import { InvoicesTab } from './InvoicesTab';
import { StructuresTab } from './StructuresTab';
import { PayoutAccountTab } from './PayoutAccountTab';
import { MyPayoutsTab } from './MyPayoutsTab';

export function FeesView() {
  const { data: sumRes } = useGetFeesSummaryQuery();
  const s = sumRes?.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" description="Collect fees, manage structures and track dues." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Collected this month"
          value={s ? formatCurrency(s.collectedThisMonth) : '—'}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={s ? formatCurrency(s.outstanding) : '—'}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Pending invoices"
          value={s ? s.pendingInvoices.toLocaleString('en-PK') : '—'}
          icon={FileText}
          tone="primary"
        />
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="payouts">Online Payouts</TabsTrigger>
          <TabsTrigger value="payout">Payout Account</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="structures">
          <StructuresTab />
        </TabsContent>
        <TabsContent value="payouts">
          <MyPayoutsTab />
        </TabsContent>
        <TabsContent value="payout">
          <PayoutAccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
