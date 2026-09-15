'use client';

import { useEffect, useState } from 'react';
import { Wallet, Clock, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoNote } from '@/components/ui/info-note';
import { useGetFeesSummaryQuery } from '@/store/api/feesApi';
import { formatCurrency } from '@/lib/utils';
import { InvoicesTab } from './InvoicesTab';
import { StructuresTab } from './StructuresTab';
import { PayoutAccountsTab } from './PayoutAccountsTab';
import { AdhocInvoiceDialog } from './AdhocInvoiceDialog';
import { FeeCoveragePanel } from './FeeCoveragePanel';

export function FeesView() {
  const { data: sumRes } = useGetFeesSummaryQuery();
  const s = sumRes?.data;
  const [adhocOpen, setAdhocOpen] = useState(false);

  // Deep-link support for "?tab=payout" — the onboarding checklist's "Add
  // a bank account" step links here, and landing on the unrelated
  // Invoices tab instead defeats the point (same pattern as
  // SettingsView.tsx's own ?tab= handling).
  const [initialTab, setInitialTab] = useState('invoices');
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab) setInitialTab(tab);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Manage fee structures, generate challans and record payments."
        actions={<Button size="sm" variant="secondary" onClick={() => setAdhocOpen(true)}><Plus size={16} /> One-off invoice</Button>}
      />

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

      <FeeCoveragePanel />

      <Tabs key={initialTab} defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="payout">Payout Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="structures">
          <StructuresTab />
        </TabsContent>
        <TabsContent value="payout">
          <PayoutAccountsTab />
        </TabsContent>
      </Tabs>

      <AdhocInvoiceDialog open={adhocOpen} onClose={() => setAdhocOpen(false)} />

      <div className="space-y-2">
        <InfoNote title="How fee collection works">
          <p>
            Marksly does not collect or hold fee money on your behalf. Challans show your own bank account
            details so parents pay you directly; once you receive a payment, record it under{' '}
            <strong>Invoices</strong> with the payment proof to keep an auditable record.
          </p>
        </InfoNote>
      </div>
    </div>
  );
}
