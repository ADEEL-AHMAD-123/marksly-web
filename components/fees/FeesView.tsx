'use client';

import { useEffect, useState } from 'react';
import {
  Wallet, Clock, FileText, Plus, RefreshCw, AlertTriangle, Landmark, LayoutList, Settings2, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoNote } from '@/components/ui/info-note';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useGetFeesSummaryQuery, useRunBillingMutation } from '@/store/api/feesApi';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { openAuthedPdf } from '@/lib/downloadFile';
import { formatCurrency } from '@/lib/utils';
import { useFeeSetupStatus } from '@/hooks/useFeeSetupStatus';
import { InvoicesTab } from './InvoicesTab';
import { StructuresTab } from './StructuresTab';
import { PayoutAccountsTab } from './PayoutAccountsTab';
import { AdhocInvoiceDialog } from './AdhocInvoiceDialog';
import { FeeCoveragePanel } from './FeeCoveragePanel';
import { FeesFirstVisitGuide } from './FeesFirstVisitGuide';
import toast from 'react-hot-toast';

/**
 * The Fees page has three real entry states, not one:
 *  - not started (no structures AND no payout account) -- shown a single
 *    guided empty page, never three empty tabs at once.
 *  - partial (one of the two exists but not both) -- worse than not
 *    started, since challans may already be generating without payment
 *    instructions on them. Gets an explicit, urgent banner distinct from
 *    FeeCoveragePanel (which only checks per-class Tuition coverage).
 *  - complete -- the normal Collections-first view below.
 * `useFeeSetupStatus` is the single source of truth for this, shared with
 * the dashboard onboarding checklist and Settings' setup checklist tab so
 * all three surfaces never independently drift on the same live data.
 */
export function FeesView() {
  const { data: sumRes } = useGetFeesSummaryQuery();
  const s = sumRes?.data;
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [billingConfirmOpen, setBillingConfirmOpen] = useState(false);
  const [runBilling, { isLoading: billingLoading }] = useRunBillingMutation();
  const setup = useFeeSetupStatus();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const [previewingSlip, setPreviewingSlip] = useState(false);

  // Lets an admin see the exact challan a parent will receive -- their own
  // logo/address and whichever bank account is currently default -- with
  // made-up student/amount data, before a single real invoice exists. See
  // fee.service.ts's generateSampleSlip().
  const handlePreviewSlip = async () => {
    setPreviewingSlip(true);
    try {
      await openAuthedPdf('/fees/sample-slip', accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate the sample slip');
    } finally {
      setPreviewingSlip(false);
    }
  };

  // Deep-link support: "?tab=payout" (onboarding's "Add a bank account"
  // step) and "?tab=structures" both land inside the consolidated "Setup"
  // tab, on the right sub-section; "?tab=invoices" (or none) lands on
  // Collections. `autoOpen` additionally pops the relevant "Add" drawer
  // open, but only once setup data confirms that section is genuinely
  // empty -- never on top of existing structures/accounts.
  const [initialTopTab, setInitialTopTab] = useState('collections');
  const [initialSetupTab, setInitialSetupTab] = useState('structures');
  const [autoOpen, setAutoOpen] = useState(false);
  // Which status the Collections tab should land pre-filtered on, driven by
  // clicking a stat card ("Outstanding" -> overdue, "Pending invoices" ->
  // pending). Undefined leaves InvoicesTab on its own default ("all").
  const [collectionsFilter, setCollectionsFilter] = useState<string | undefined>(undefined);
  // Bumped on every stat-card click so the top-level Tabs remounts and jumps
  // to Collections even if the admin had already switched to Setup and the
  // `initialTopTab` value itself isn't changing (e.g. clicking "Outstanding"
  // twice in a row) -- Tabs is uncontrolled, so only a key change moves it.
  const [tabNonce, setTabNonce] = useState(0);
  const jumpToCollections = (status: string) => {
    setInitialTopTab('collections');
    setCollectionsFilter(status);
    setTabNonce((n) => n + 1);
  };
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'payout') {
      setInitialTopTab('setup');
      setInitialSetupTab('payout');
      setAutoOpen(true);
    } else if (tab === 'structures') {
      setInitialTopTab('setup');
      setInitialSetupTab('structures');
      setAutoOpen(true);
    } else if (tab === 'invoices' || tab === 'collections') {
      setInitialTopTab('collections');
    }
  }, []);

  const handleRunBilling = async () => {
    const now = new Date();
    try {
      const res = await runBilling({ month: now.getMonth() + 1, year: now.getFullYear() }).unwrap();
      toast.success(`Billing done — ${res.data.created} invoice(s) created across ${res.data.structures} structure(s)`);
      setBillingConfirmOpen(false);
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not run billing');
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant="ghost" loading={previewingSlip} onClick={handlePreviewSlip} title="See exactly what a parent will receive, with sample data">
        <Eye size={16} /> Preview a sample challan
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setAdhocOpen(true)}><Plus size={16} /> One-off invoice</Button>
      {!setup.isLoading && !setup.isNotStarted && (
        <Button size="sm" variant="ghost" onClick={() => setBillingConfirmOpen(true)}>
          <RefreshCw size={16} /> Generate this month's bills
        </Button>
      )}
    </div>
  );

  // ---- Not started: one dedicated guided page, not three empty tabs ----
  if (!setup.isLoading && setup.isNotStarted) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fees"
          description="Manage fee structures, generate challans and record payments."
        />
        <Card>
          <EmptyState
            icon={Wallet}
            title="Let's set up fee collection"
            description="Before any challan can go out, add at least one fee structure (what students owe) and one bank account (where they pay it). Both are quick, one-time setup steps."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" onClick={() => { setInitialSetupTab('structures'); setInitialTopTab('setup'); setAutoOpen(true); }}>
                  <FileText size={16} /> Add fee structure
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setInitialSetupTab('payout'); setInitialTopTab('setup'); setAutoOpen(true); }}>
                  <Landmark size={16} /> Add bank account
                </Button>
                <Button size="sm" variant="ghost" loading={previewingSlip} onClick={handlePreviewSlip}>
                  <Eye size={16} /> See a sample challan first
                </Button>
              </div>
            }
          />
        </Card>

        {/* Rendered but scrolled to below the guided empty state, in case the
            admin wants to jump straight into Setup instead of using the CTAs
            above -- same tabs, just not the page's primary focus yet. */}
        <Tabs key={initialSetupTab} defaultValue={initialSetupTab} className="pt-2">
          <TabsList>
            <TabsTrigger value="structures">What you charge</TabsTrigger>
            <TabsTrigger value="payout">Where you get paid</TabsTrigger>
          </TabsList>
          <TabsContent value="structures" className="pt-4"><StructuresTab autoOpenOnEmpty={autoOpen && initialSetupTab === 'structures'} /></TabsContent>
          <TabsContent value="payout" className="pt-4"><PayoutAccountsTab autoOpenOnEmpty={autoOpen && initialSetupTab === 'payout'} /></TabsContent>
        </Tabs>

        <AdhocInvoiceDialog open={adhocOpen} onClose={() => setAdhocOpen(false)} />
        <FeesFirstVisitGuide show />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Manage fee structures, generate challans and record payments."
        actions={headerActions}
      />

      {/* Partial setup: worse than not-started, since challans may already
          be going out with structures configured but nowhere to pay, or a
          bank account on file that nothing is billing against yet. Distinct
          from FeeCoveragePanel below, which only flags per-class Tuition
          gaps once basic setup already exists. */}
      {!setup.isLoading && setup.isPartial && (
        <Card className="border-warning/50 bg-warning-soft p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Fee setup is incomplete</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {!setup.hasPayoutAccount
                  ? "You have fee structures configured but no bank account on file — challans generated now won't tell parents where to pay."
                  : 'You have a bank account on file but no fee structures yet — nothing will be billed to parents until at least one is added.'}
              </p>
              <div className="mt-2">
                {!setup.hasPayoutAccount ? (
                  <Button size="sm" variant="secondary" onClick={() => { setInitialSetupTab('payout'); setInitialTopTab('setup'); setAutoOpen(true); }}>
                    <Landmark size={14} /> Add bank account
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => { setInitialSetupTab('structures'); setInitialTopTab('setup'); setAutoOpen(true); }}>
                    <FileText size={14} /> Add fee structure
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Collected this month" value={s ? formatCurrency(s.collectedThisMonth) : '—'} icon={Wallet} tone="success" />
        <StatCard
          label="Outstanding"
          value={s ? formatCurrency(s.outstanding) : '—'}
          icon={Clock}
          tone="warning"
          onClick={() => jumpToCollections('overdue')}
        />
        <StatCard
          label="Pending invoices"
          value={s ? s.pendingInvoices.toLocaleString('en-PK') : '—'}
          icon={FileText}
          tone="primary"
          onClick={() => jumpToCollections('pending')}
        />
      </div>

      <FeeCoveragePanel />

      <Tabs key={`${initialTopTab}-${tabNonce}`} defaultValue={initialTopTab}>
        <TabsList>
          <TabsTrigger value="collections"><LayoutList size={14} className="mr-1.5" /> Collections</TabsTrigger>
          <TabsTrigger value="setup"><Settings2 size={14} className="mr-1.5" /> Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="collections" className="pt-4">
          {/* Keyed on the filter so clicking a different stat card forces a
              remount -- InvoicesTab seeds its internal filter state from
              `initialStatus` only once, via useState's lazy initializer, so
              without this key a second click while already on Collections
              would silently do nothing. */}
          <InvoicesTab key={collectionsFilter ?? 'all'} initialStatus={collectionsFilter} />
        </TabsContent>
        <TabsContent value="setup" className="pt-4">
          <Tabs key={initialSetupTab} defaultValue={initialSetupTab}>
            <TabsList>
              <TabsTrigger value="structures">What you charge</TabsTrigger>
              <TabsTrigger value="payout">Where you get paid</TabsTrigger>
            </TabsList>
            <TabsContent value="structures" className="pt-4"><StructuresTab autoOpenOnEmpty={autoOpen && initialSetupTab === 'structures'} /></TabsContent>
            <TabsContent value="payout" className="pt-4"><PayoutAccountsTab autoOpenOnEmpty={autoOpen && initialSetupTab === 'payout'} /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <AdhocInvoiceDialog open={adhocOpen} onClose={() => setAdhocOpen(false)} />

      <div className="space-y-2">
        <InfoNote title="New to fee collection? Read this first">
          <p>
            Marksly does not collect or hold fee money on your behalf. Challans show your own bank account
            details so parents pay you directly; once you receive a payment, record it under{' '}
            <strong>Collections</strong> with the payment proof to keep an auditable record.
          </p>
          <p className="mt-3 font-medium text-foreground">A few common questions:</p>
          <p className="mt-1"><strong>Why doesn't Marksly hold the money itself?</strong> So there's never a delay or a middleman between a parent's payment and your account -- they pay you directly, the same way they would with a paper challan.</p>
          <p className="mt-2"><strong>What if I record a payment wrong?</strong> Nothing is silently overwritten. You void the mistaken entry with a reason, then record it correctly -- the full history stays visible under a student's invoice.</p>
          <p className="mt-2"><strong>Can I undo a mistake?</strong> Payments and invoices are voided or waived, never deleted -- so a correction is always visible, and nothing about money is ever quietly erased.</p>
          <p className="mt-2"><strong>Why do I need a bank account before generating bills?</strong> Every challan needs somewhere real for the parent to pay into -- without one, you'd be sending bills with no payment instructions on them.</p>
          <p className="mt-2"><strong>What's the difference between an invoice and a challan?</strong> They're the same bill -- "invoice" is what you see and manage here; "challan" is the printed/downloadable version a parent actually pays against.</p>
        </InfoNote>
      </div>

      <ConfirmDialog
        open={billingConfirmOpen}
        onClose={() => setBillingConfirmOpen(false)}
        onConfirm={handleRunBilling}
        title="Generate this month's bills now?"
        description="Generates this month's invoices across every active fee structure, for every student it applies to. Students who already have an invoice for this cycle are skipped — safe to run more than once."
        confirmLabel="Run billing"
        tone="warning"
        loading={billingLoading}
        icon={RefreshCw}
      />
    </div>
  );
}
