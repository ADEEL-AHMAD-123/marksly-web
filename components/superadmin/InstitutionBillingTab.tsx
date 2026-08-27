'use client';

import { Wallet, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  type InstitutionDetail, type PlanHistoryEntry, useGetPlansQuery,
} from '@/store/api/superadminApi';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Row, fallbackBadge } from './InstitutionDetailShared';

const originLabel: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  auto_renewal: 'Auto-renewal',
  checkout: 'Manual (online)',
};

const planHistorySource: Record<PlanHistoryEntry['source'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  payment: { label: 'Real payment', variant: 'success' },
  self_serve_free: { label: 'Self-serve (free)', variant: 'neutral' },
  scheduled_downgrade: { label: 'Scheduled downgrade', variant: 'neutral' },
  admin_override: { label: 'Admin override — no payment', variant: 'warning' },
  unknown: { label: 'Unknown', variant: 'neutral' },
};

const declineReasonLabel: Record<string, string> = {
  insufficient_funds: 'Insufficient funds',
  expired_card: 'Card expired',
  card_blocked: 'Declined by issuer',
  auth_failed: 'Authentication failed',
  gateway_error: 'Gateway error',
  other: 'Declined',
};

/** Billing tab — subscription summary, payment history, auto-renewal charge attempts,
 * plan history, and the administrative plan-override control.
 * `saving` and `setPlan` are passed down from the parent so the loading state stays
 * shared with the header's Suspend/Activate action (same underlying mutation call). */
export function InstitutionBillingTab({
  inst, payments, chargeAttempts, planHistory, saving, setPlan,
}: {
  inst: InstitutionDetail['institution'];
  payments: InstitutionDetail['payments'];
  chargeAttempts: InstitutionDetail['chargeAttempts'];
  planHistory: PlanHistoryEntry[];
  saving: boolean;
  setPlan: (planType: string) => void;
}) {
  // Previously a hardcoded 4-item list — a superadmin who created a bespoke
  // plan via the Plans catalog (any key is allowed there, e.g. a negotiated
  // per-institution deal) had no way to actually select it here, even
  // though the backend (applyPlanToInstitution()) always supported
  // assigning any plan that exists in the catalog. Pulling the live list
  // means a newly created custom plan shows up here immediately.
  const { data: plansRes } = useGetPlansQuery();
  const planOpts = plansRes?.data?.length ? plansRes.data.map((p) => p.key) : ['free', 'growth', 'standard', 'enterprise'];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet size={18} /> Subscription</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Plan" value={inst.plan[0].toUpperCase() + inst.plan.slice(1)} />
          <Row label="Monthly amount" value={formatCurrency(inst.monthlyAmount)} />
          <Row label="Status" value={fallbackBadge(inst.status).label} />
          <Row label="Subscribed since" value={inst.subscribedSince ? formatDate(inst.subscribedSince) : '—'} />
          <Row label="Last payment" value={inst.lastPaymentAt ? formatDateTime(inst.lastPaymentAt) : '—'} />
          <Row label="Next billing" value={inst.nextBillingAt ? formatDate(inst.nextBillingAt) : '—'} />
          <Row
            label="Auto-renewal"
            value={inst.autoRenew ? `On (card •••• ${inst.savedCardLast4 ?? '····'})` : 'Off — manual payment'}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <TableWrapper className="rounded-none border-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date &amp; time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground">{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{p.gateway}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <Badge variant={p.origin === 'auto_renewal' ? 'neutral' : 'neutral'}>{originLabel[p.origin] ?? p.origin}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'success' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'} className="capitalize">{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(p.paidAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </CardContent>
      </Card>

      {/* Only shown when there's actually auto-renewal attempt history
          to review — most institutions (manual-only) will never see
          this card at all. Surfaces the same decline-reason data the
          institution admin already sees on their own billing page
          (myBilling()'s lastChargeAttempt), so a superadmin
          investigating a past_due account doesn't have to guess why
          auto-renewal gave up. */}
      {chargeAttempts.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Auto-renewal charge attempts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <TableWrapper className="rounded-none border-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Amount</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Attempted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chargeAttempts.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground">{formatCurrency(a.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={a.success ? 'success' : 'danger'}>{a.success ? 'Succeeded' : 'Declined'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.reasonCode ? declineReasonLabel[a.reasonCode] ?? a.reasonCode : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(a.attemptedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </CardContent>
        </Card>
      )}

      {/* Every plan-affecting event, clearly labeled with exactly why
          it happened — a real settled payment (with method and
          amount), a free self-serve selection, a scheduled downgrade
          finally applying, or a superadmin override with no payment.
          This is the single source of truth for "where did this
          institution's current plan actually come from," so there's
          never ambiguity between a real subscriber and a comp/admin
          account when looking at revenue. */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Plan history</CardTitle>
          <CardDescription>Every time this institution's plan changed, and exactly why — real payment or admin override.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {planHistory.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No plan changes recorded yet.</p>
          ) : (
            <TableWrapper className="rounded-none border-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Change</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Date &amp; time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planHistory.map((h) => {
                    const src = planHistorySource[h.source] ?? planHistorySource.unknown;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium capitalize text-foreground">
                          {h.fromPlan ? <>{h.fromPlan} <span className="text-muted-foreground">→</span> {h.toPlan}</> : h.toPlan}
                        </TableCell>
                        <TableCell>
                          <Badge variant={src.variant}>{src.label}</Badge>
                          {h.gateway && <span className="ml-1.5 text-xs capitalize text-muted-foreground">via {h.gateway}</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{h.amount ? formatCurrency(h.amount) : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{h.byAdmin ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(h.at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </CardContent>
      </Card>

      {/* Deliberately separated from the quick-action header above
          (Suspend/Activate) and requires its own confirmation in
          setPlan() — this is an administrative override, not a
          payment. It never appears in this institution's payment
          history and never counts toward platform-wide MRR/revenue
          (see applyPlanToInstitution()'s own comment on the backend)
          until the institution actually pays through the normal
          billing flow. Use for comp accounts, correcting a mistake,
          or honoring a deal negotiated outside Marksly — not as a
          substitute for real payment. */}
      <Card className="lg:col-span-3 border-warning/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning"><ShieldAlert size={18} /> Administrative override</CardTitle>
          <CardDescription>
            Directly assign a plan without a payment. Takes effect immediately, but is never recorded as revenue —
            the institution's payment history and the platform's revenue numbers are unaffected until they actually pay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="plan-override" className="text-sm text-muted-foreground">Set plan to</Label>
            <Select value={inst.plan} onValueChange={setPlan}>
              <SelectTrigger id="plan-override" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {planOpts.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {saving && <span className="text-xs text-muted-foreground">Applying…</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
