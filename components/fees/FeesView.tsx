'use client';

import { useEffect, useState } from 'react';
import {
  Wallet, FileText, Plus, RefreshCw, AlertTriangle, Landmark, LayoutList, FileStack, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoNote } from '@/components/ui/info-note';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRunBillingMutation, usePreviewBillingQuery } from '@/store/api/feesApi';
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
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [billingConfirmOpen, setBillingConfirmOpen] = useState(false);
  const [runBilling, { isLoading: billingLoading }] = useRunBillingMutation();
  // Only fetched while the confirm dialog is actually open (`skip`) -- no
  // point hitting the preview endpoint on every page load for an action
  // the admin runs once a month.
  const now = new Date();
  const { data: previewRes, isFetching: previewLoading } = usePreviewBillingQuery(
    { month: now.getMonth() + 1, year: now.getFullYear() },
    { skip: !billingConfirmOpen }
  );
  const preview = previewRes?.data;
  const setup = useFeeSetupStatus();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const [previewingSlip, setPreviewingSlip] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const institutionId = useSelector((s: RootState) => s.auth.user?.institutionId);

  // Auto-open the "how does this work" walkthrough once per institution the
  // first time it lands on a not-started Fees page -- but only once ever;
  // after that it's reachable only via the permanent "How does this work?"
  // link, never forced again. Runs after setup finishes loading so it
  // doesn't fire on a still-loading page and then again once data resolves.
  useEffect(() => {
    if (setup.isLoading || !setup.isNotStarted || !institutionId) return;
    try {
      const seenKey = `fees-guide-seen-${institutionId}`;
      if (!window.localStorage.getItem(seenKey)) {
        window.localStorage.setItem(seenKey, '1');
        setGuideOpen(true);
      }
    } catch {
      // Private browsing / blocked storage -- just skip the auto-open;
      // the "How does this work?" link still opens it manually.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.isLoading, setup.isNotStarted, institutionId]);

  // Lets an admin see the exact challan a parent or student will receive -- their own
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
  const [autoOpen, setAutoOpen] = useState(false);
  // Bumped whenever a jump needs to force the top-level Tabs to remount and
  // switch (e.g. the partial-setup banner's "Add bank account"/"Add fee
  // structure" buttons) even when `initialTopTab`'s value itself isn't
  // changing -- Tabs is uncontrolled, so only a key change moves it.
  const [tabNonce, setTabNonce] = useState(0);
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'payout') {
      setInitialTopTab('payout');
      setAutoOpen(true);
    } else if (tab === 'structures') {
      setInitialTopTab('structures');
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

  // Three actions of genuinely different weight -- a rare, read-only
  // preview; an occasional one-off form; and the actual monthly batch job
  // every institution depends on -- were previously rendered as three
  // near-identical ghost/secondary buttons in one row, so nothing signaled
  // which one mattered most. A thin divider now separates "just looking"
  // from "does something", and the recurring billing run gets the primary
  // (most prominent) treatment since it's the one thing that has to happen
  // every month for challans to go out at all.
  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant="ghost" loading={previewingSlip} onClick={handlePreviewSlip} title="See exactly what a parent or student will receive, with sample data">
        <Eye size={16} /> Preview a sample challan
      </Button>
      <div className="hidden h-5 w-px bg-border sm:block" />
      <Button size="sm" variant="secondary" onClick={() => setAdhocOpen(true)}><Plus size={16} /> One-off invoice</Button>
      {!setup.isLoading && !setup.isNotStarted && (
        <Button size="sm" variant="primary" onClick={() => setBillingConfirmOpen(true)}>
          <RefreshCw size={16} /> Generate this month's bills
        </Button>
      )}
    </div>
  );

  // ---- Not started: one short intro, then the same Setup tabs everyone
  // else uses -- NOT a second set of "add" buttons and a second empty
  // state stacked on top of the tabs' own. The intro's job is orientation
  // (what is this, how does it work), not duplicating actions the tabs
  // below already provide. ----
  if (!setup.isLoading && setup.isNotStarted) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fees"
          description="Manage fee structures, generate challans and record payments."
        />
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Wallet size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Let's set up fee collection</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Before any challan can go out, add at least one fee structure (what students owe) and one bank
                account (where they pay it) below. Both are quick, one-time setup steps.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <button type="button" onClick={() => setGuideOpen(true)} className="font-medium text-primary hover:underline">
                  How does this work?
                </button>
                <button type="button" onClick={handlePreviewSlip} disabled={previewingSlip} className="font-medium text-primary hover:underline disabled:opacity-50">
                  {previewingSlip ? 'Generating…' : 'See a sample challan first'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Tabs key={initialTopTab} defaultValue={initialTopTab === 'payout' ? 'payout' : 'structures'}>
          <TabsList>
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="payout">Bank Accounts</TabsTrigger>
          </TabsList>
          <TabsContent value="structures" className="pt-4"><StructuresTab autoOpenOnEmpty={autoOpen && initialTopTab === 'structures'} /></TabsContent>
          <TabsContent value="payout" className="pt-4"><PayoutAccountsTab autoOpenOnEmpty={autoOpen && initialTopTab === 'payout'} /></TabsContent>
        </Tabs>

        <AdhocInvoiceDialog open={adhocOpen} onClose={() => setAdhocOpen(false)} />
        <FeesFirstVisitGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
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
                  ? "You have fee structures configured but no bank account on file — challans generated now won't tell parents or students where to pay."
                  : 'You have a bank account on file but no fee structures yet — nothing will be billed to parents or students until at least one is added.'}
              </p>
              <div className="mt-2">
                {!setup.hasPayoutAccount ? (
                  <Button size="sm" variant="secondary" onClick={() => { setInitialTopTab('payout'); setAutoOpen(true); setTabNonce((n) => n + 1); }}>
                    <Landmark size={14} /> Add bank account
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => { setInitialTopTab('structures'); setAutoOpen(true); setTabNonce((n) => n + 1); }}>
                    <FileText size={14} /> Add fee structure
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* A single row of to-the-point, purpose-named tabs -- Collections
          for the daily work, and Fee Structures / Bank Accounts as their
          own tabs rather than nested one level down inside a generic
          "Setup" tab. The old two-level Collections/Setup->What-you-charge/
          Where-you-get-paid nesting meant an admin saw two stacked pill
          bars just to get to bank accounts; this collapses that into one
          bar, one click away, same as Collections always was.

          Each tab now ALSO only shows what's actually about it -- the
          Collections stat cards, the Tuition-coverage panel (a Fee
          Structures setup concern) and the Collections-flavoured FAQ used
          to render above/below every tab regardless of which one was
          active, so switching to Bank Accounts still showed "Collected
          this month" and a Collections FAQ with nothing to do with either
          tab. That's now scoped to the one tab each belongs to. */}
      <Tabs key={`${initialTopTab}-${tabNonce}`} defaultValue={initialTopTab}>
        <TabsList>
          <TabsTrigger value="collections"><LayoutList size={14} className="mr-1.5" /> Collections</TabsTrigger>
          <TabsTrigger value="structures"><FileStack size={14} className="mr-1.5" /> Fee Structures</TabsTrigger>
          <TabsTrigger value="payout"><Landmark size={14} className="mr-1.5" /> Bank Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="collections" className="space-y-4 pt-4">
          <InvoicesTab />
          <InfoNote title="New to fee collection? Read this first">
            <p>
              Marksly does not collect or hold fee money on your behalf. Challans show your own bank account
              details so whoever is paying -- a parent or the student -- pays you directly; once you receive a payment, record it right here with the payment proof to keep an auditable record.
            </p>
            <p className="mt-3 font-medium text-foreground">A few common questions:</p>
            <p className="mt-1"><strong>Why doesn't Marksly hold the money itself?</strong> So there's never a delay or a middleman between a payment and your account -- whoever pays, parent or student, pays you directly, the same way they would with a paper challan.</p>
            <p className="mt-2"><strong>What if I record a payment wrong?</strong> Nothing is silently overwritten. You void the mistaken entry with a reason, then record it correctly -- the full history stays visible under a student's invoice.</p>
            <p className="mt-2"><strong>Can I undo a mistake?</strong> Payments and invoices are voided or waived, never deleted -- so a correction is always visible, and nothing about money is ever quietly erased.</p>
            <p className="mt-2"><strong>Why do I need a bank account before generating bills?</strong> Every challan needs somewhere real for the payer -- parent or student -- to pay into -- without one, you'd be sending bills with no payment instructions on them.</p>
            <p className="mt-2"><strong>What's the difference between an invoice and a challan?</strong> They're the same bill -- "invoice" is what you see and manage here; "challan" is the printed/downloadable version a parent or student actually pays against.</p>
            <button type="button" onClick={() => setGuideOpen(true)} className="mt-3 font-medium text-primary hover:underline">
              Replay the "how fees work" walkthrough
            </button>
          </InfoNote>
        </TabsContent>
        <TabsContent value="structures" className="space-y-4 pt-4">
          <FeeCoveragePanel />
          <StructuresTab autoOpenOnEmpty={autoOpen && initialTopTab === 'structures'} />
        </TabsContent>
        <TabsContent value="payout" className="pt-4">
          <PayoutAccountsTab autoOpenOnEmpty={autoOpen && initialTopTab === 'payout'} />
        </TabsContent>
      </Tabs>

      <AdhocInvoiceDialog open={adhocOpen} onClose={() => setAdhocOpen(false)} />

      <FeesFirstVisitGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      <ConfirmDialog
        open={billingConfirmOpen}
        onClose={() => setBillingConfirmOpen(false)}
        onConfirm={handleRunBilling}
        title="Generate this month's bills now?"
        description={
          <>
            <p>
              Generates this month's invoices across every active fee structure, for every student it applies to.
              Students who already have an invoice for this cycle are skipped — safe to run more than once.
            </p>
            <p className="mt-2 font-medium text-foreground">
              {previewLoading
                ? 'Checking what this would actually create…'
                : preview
                  ? (preview.created > 0
                      ? `Right now, this would create ${preview.created.toLocaleString('en-PK')} invoice${preview.created === 1 ? '' : 's'} totalling ${formatCurrency(preview.totalAmount)}.`
                      : "Right now, this wouldn't create anything -- every eligible student already has an invoice for this cycle.")
                  : null}
            </p>
          </>
        }
        confirmLabel="Run billing"
        tone="warning"
        loading={billingLoading}
        icon={RefreshCw}
      />
    </div>
  );
}
