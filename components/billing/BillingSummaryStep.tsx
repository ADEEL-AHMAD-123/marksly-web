'use client';

import {
  CreditCard, Info, Sparkles, AlertTriangle, Wallet, Clock, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { MyBilling, BillingPayment } from '@/store/api/billingApi';
import { statusBadge, payBadge, payIcon, declineReasonLabel } from './billing.constants';

/* ── Step 1: summary — the landing view, with clear next actions ────────── */
export function SummaryStep({
  b, free, needsPayment, trialExpired, onChangePlan, onPay, onCancelScheduled,
  extraPayments, onLoadMorePayments, loadingMorePayments,
  onEnableAutoRenew, onDisableAutoRenew, startingAutoRenew, disablingAutoRenew,
}: {
  b: MyBilling;
  free: boolean;
  needsPayment: boolean;
  trialExpired: boolean;
  onChangePlan: () => void;
  onPay: () => void;
  onCancelScheduled: () => void;
  extraPayments: BillingPayment[];
  onLoadMorePayments: () => void;
  loadingMorePayments: boolean;
  onEnableAutoRenew: () => void;
  onDisableAutoRenew: () => void;
  startingAutoRenew: boolean;
  disablingAutoRenew: boolean;
}) {
  const allPayments = [...b.payments, ...extraPayments];
  const hasMorePayments = allPayments.length < b.paymentsTotal;
  return (
    <div className="space-y-6">
      {/* Exactly one banner can ever show — pending plan change takes
          priority over an outstanding renewal, since it's the more specific
          and more recent thing needing attention. Never show both at once,
          and never let their numbers appear anywhere near the plan card
          below (that's what caused the "Enterprise costs Rs 6,000?"
          confusion). */}
      {b.pendingPlan ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 px-4 py-3.5 text-sm text-primary sm:flex-row sm:items-start">
          <Info size={17} className="mt-0.5 shrink-0" />
          <span className="flex-1">
            You've selected the <strong className="capitalize">{b.pendingPlan}</strong> plan —{' '}
            <strong>{formatCurrency(b.amountDue)}/{b.billingCycle === 'annual' ? 'yr' : 'mo'}</strong>.
            It won't take effect until payment is completed. You're still on{' '}
            <strong className="capitalize">{b.plan}</strong> for now, and nothing has been charged.
          </span>
          <Button size="sm" onClick={onPay}>Complete payment</Button>
        </div>
      ) : b.scheduledPlan ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/50 px-4 py-3.5 text-sm text-foreground">
          <Info size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            You're moving to the <strong className="capitalize">{b.scheduledPlan}</strong> plan
            {b.nextBillingAt && <> on <strong>{formatDate(b.nextBillingAt)}</strong></>} — no payment
            needed, you'll keep <strong className="capitalize">{b.plan}</strong> until then.
          </span>
          <Button size="sm" variant="ghost" onClick={onCancelScheduled}>Cancel</Button>
        </div>
      ) : needsPayment ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 text-sm text-warning sm:flex-row sm:items-start">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <span className="flex-1">
            Your <strong className="capitalize">{b.plan}</strong> plan payment of{' '}
            <strong>{formatCurrency(b.amountDue)}</strong> has not been paid yet.
          </span>
          <Button size="sm" onClick={onPay}>Pay now</Button>
        </div>
      ) : trialExpired ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3.5 text-sm text-foreground sm:flex-row sm:items-start">
          <Info size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            Your trial period has ended — you're still on the <strong className="capitalize">{b.plan}</strong> plan
            with no changes to your account. Take a look at paid plans whenever you're ready to unlock more.
          </span>
          <Button size="sm" variant="secondary" onClick={onChangePlan}>View plans</Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Wallet size={18} /></span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Current plan</p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <p className="text-2xl font-bold capitalize text-foreground">{b.plan}</p>
                {!free && <p className="text-sm text-muted-foreground">{formatCurrency(b.planPrice)}/{b.billingCycle === 'annual' ? 'yr' : 'mo'}</p>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant={statusBadge[b.status] ?? 'neutral'} className="capitalize">{b.status.replace('_', ' ')}</Badge>
                {b.planSource === 'admin_override' && (
                  <Badge variant="warning" title="This plan was granted by Marksly support — no payment was collected for it.">
                    Granted by support
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Clock size={18} /></span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Next renewal</p>
              <p className="mt-0.5 text-2xl font-bold text-foreground">{free ? '—' : b.nextBillingAt ? formatDate(b.nextBillingAt) : '—'}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {free ? 'Free plan — nothing to renew' : b.lastPaymentAt ? `Last paid ${formatDateTime(b.lastPaymentAt)}` : 'No payments yet'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* One clear primary action depending on state, never several
          competing buttons that all sort of do the same thing. */}
      <div className="flex flex-wrap gap-2">
        {free && (
          <Button onClick={onChangePlan}><Sparkles size={16} /> Choose a paid plan</Button>
        )}
        {!free && !b.pendingPlan && (
          <Button variant="secondary" onClick={onChangePlan}><Sparkles size={16} /> Change plan</Button>
        )}
        {!free && b.pendingPlan && (
          <Button variant="secondary" onClick={onChangePlan}><Sparkles size={16} /> Choose a different plan</Button>
        )}
        {!free && !needsPayment && !b.pendingPlan && (
          <Button variant="ghost" onClick={onPay}><CreditCard size={16} /> Renew early</Button>
        )}
      </div>

      {/* Auto-renewal — a distinct opt-in, never shown for the free plan
          (nothing to auto-charge). The "Save a card" entry point is gated
          on the feature flag, but the card itself (and the "Turn off"
          action specifically) still renders for anyone who's ALREADY
          enrolled even if the flag gets turned off later — otherwise an
          institution that opted in before a platform-side pause would have
          no way to see or disable their own auto-renewal state. */}
      {!free && (b.autoRenewalAvailable || b.autoRenew) && (
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                b.autoRenew ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
              )}>
                <RefreshCw size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Auto-renewal</p>
                {b.autoRenew && b.savedCard ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    We'll automatically charge <strong className="text-foreground">{b.savedCard.brand ?? 'your card'} •••• {b.savedCard.last4 ?? '····'}</strong>
                    {b.savedCard.expiry && <> (expires {b.savedCard.expiry})</>} on your renewal date — no need to pay manually.
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Paying online automatically saves your card for future renewals — nothing extra to do. If you paid
                    by bank transfer, or want to set it up separately, you can save a card here too. You can turn this off any time.
                  </p>
                )}
              </div>
            </div>
            {b.autoRenew ? (
              <Button size="sm" variant="ghost" loading={disablingAutoRenew} onClick={onDisableAutoRenew}>Turn off</Button>
            ) : (
              <Button size="sm" variant="secondary" loading={startingAutoRenew} onClick={onEnableAutoRenew}>
                <CreditCard size={14} /> Save a card
              </Button>
            )}
          </div>
          {/* Visible dunning state — if recent auto-charge attempts have
              failed, say so plainly rather than letting it fail silently
              until the account eventually goes past-due with no context. */}
          {b.autoRenew && b.autoChargeFailCount > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Your saved card was declined on the last {b.autoChargeFailCount === 1 ? 'attempt' : `${b.autoChargeFailCount} attempts`}
                  {b.lastChargeAttempt?.reasonCode && <> — reported reason: {declineReasonLabel[b.lastChargeAttempt.reasonCode] ?? 'declined by the card issuer'}</>} —
                  we'll keep retrying automatically for a few days. You can pay this cycle manually now, or replace your card.
                </span>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="secondary" onClick={onPay}>Pay manually</Button>
                <Button size="sm" variant="ghost" loading={startingAutoRenew} onClick={onEnableAutoRenew}>Update card</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Every payment attempt for your subscription, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {allPayments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Wallet size={22} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            </div>
          ) : (
            <>
              <TableWrapper>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date & time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPayments.map((p, i) => {
                      const Icon = payIcon[p.status] ?? Clock;
                      return (
                        <TableRow key={p.id ?? i}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(p.paidAt ?? p.createdAt)}</TableCell>
                          <TableCell className="font-medium text-foreground">{formatCurrency(p.amount)}</TableCell>
                          <TableCell className="capitalize text-muted-foreground">{p.gateway}</TableCell>
                          <TableCell className="max-w-[160px] truncate text-muted-foreground" title={p.reference ?? ''}>{p.reference ?? '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant={payBadge[p.status]}
                                className="capitalize"
                                title={
                                  p.status === 'pending'
                                    ? p.gateway === 'bank'
                                      ? 'Waiting for manual confirmation by our team — usually within one business day. Contact support if it has been longer.'
                                      : 'Still being processed by the payment gateway — this should resolve on its own shortly.'
                                    : p.status === 'failed'
                                      ? 'This attempt did not go through. It was not charged — try again or use a different method.'
                                      : undefined
                                }
                              >
                                <Icon size={11} /> {p.status}
                              </Badge>
                              {p.disputed && (
                                <Badge variant="danger" title="A chargeback was reported for this payment — under review">
                                  <AlertTriangle size={11} /> Disputed
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableWrapper>
              {hasMorePayments && (
                <div className="flex justify-center pt-4">
                  <Button size="sm" variant="secondary" loading={loadingMorePayments} onClick={onLoadMorePayments}>
                    Load more ({allPayments.length} of {b.paymentsTotal})
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
