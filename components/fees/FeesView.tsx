'use client';

import { Wallet, Clock, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoNote } from '@/components/ui/info-note';
import { useGetFeesSummaryQuery } from '@/store/api/feesApi';
import { formatCurrency } from '@/lib/utils';
import { InvoicesTab } from './InvoicesTab';
import { StructuresTab } from './StructuresTab';
import { PayoutAccountTab } from './PayoutAccountTab';
import { MyPayoutsTab } from './MyPayoutsTab';
import { RefundsNeedingReviewTab } from './RefundsNeedingReviewTab';

export function FeesView() {
  const { data: sumRes } = useGetFeesSummaryQuery();
  const s = sumRes?.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" description="Collect fees, manage structures and track dues." />

      <InfoNote title="Where does online fee money actually go?">
        <p>
          Card, JazzCash and EasyPaisa payments made by parents and students don't land in your bank account
          instantly — they collect here first, then get paid out to the bank account you set under{' '}
          <strong>Payout Account</strong>. A new or changed payout account has to be verified before the next
          payout goes out, so update it a few days before you're expecting a payout, not the day of.
        </p>
        <p>
          <strong>Online Payouts</strong> shows what's been paid out so far and any refunds that need your review —
          it's separate from <strong>Invoices</strong>, which is where you record fees collected manually (cash,
          bank transfer, etc.).
        </p>
      </InfoNote>

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
          <div className="space-y-4">
            <RefundsNeedingReviewTab />
            <MyPayoutsTab />
          </div>
        </TabsContent>
        <TabsContent value="payout">
          <PayoutAccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
