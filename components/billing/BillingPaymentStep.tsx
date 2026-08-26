'use client';

import { useState } from 'react';
import {
  CreditCard, Building2, Info, Copy, CheckCircle2, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { Gateway, MyBilling } from '@/store/api/billingApi';
import { gatewayLabel } from './billing.constants';

/* ── Step 3: payment — only the current amount due, one focused screen ──── */
export function PaymentStep({
  b, liveGateways, checkingOut, submitting, reference, setReference, onBack, onPayOnline, onSubmitTransfer, onCopy,
}: {
  b: MyBilling;
  liveGateways: Gateway[];
  checkingOut: boolean;
  submitting: boolean;
  reference: string;
  setReference: (v: string) => void;
  onBack: () => void;
  onPayOnline: (g: Gateway) => void;
  onSubmitTransfer: (e: React.FormEvent) => void;
  onCopy: (v: string) => void;
}) {
  // Paying online is the primary, recommended path — when auto-renewal is
  // available, it's also what enrolls the institution in it (one card
  // entry both pays this bill and saves the card for future renewals, so
  // there's no separate "now go save a card" step afterward). Bank transfer
  // still works exactly as before, but it's demoted to a "pay another way"
  // disclosure instead of an equally-weighted option, since it can't be
  // auto-renewed and needs manual confirmation each time.
  const [showManual, setShowManual] = useState(false);
  const willAutoEnroll = b.autoRenewalAvailable && !b.autoRenew;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Paying for the <span className="capitalize">{b.pendingPlan || b.plan}</span> plan
          </p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(b.amountDue)}</p>
        </div>
        <Badge variant="neutral" className="capitalize">{b.billingCycle}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard size={18} /> Pay online</CardTitle>
          <CardDescription>
            {willAutoEnroll
              ? "Pay instantly by card — we'll securely save it so future renewals are charged automatically. You can turn this off any time from Billing."
              : 'Pay instantly by card or wallet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!b.online.live && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>Test mode — no online gateway is configured yet. This will simulate an instant payment.</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {liveGateways.length > 0 ? (
              liveGateways.map((g, i) => (
                <Button key={g} variant={i === 0 ? 'primary' : 'secondary'} onClick={() => onPayOnline(g)} loading={checkingOut}>
                  {gatewayLabel[g]}
                </Button>
              ))
            ) : (
              <Button onClick={() => onPayOnline('safepay')} loading={checkingOut}>Pay now (test mode)</Button>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck size={12} /> Payments are processed securely by the gateway — Marksly never sees your card details.
          </p>
        </CardContent>
      </Card>

      {/* Bank transfer — collapsed behind a disclosure rather than shown as
          an equal option, per the payment flow this page follows: card
          payment is the primary/recommended path (it's what sets up
          auto-renewal), manual transfer is a fallback for institutions who
          specifically prefer or need it. */}
      {!showManual ? (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Building2 size={14} /> Prefer to pay by bank transfer instead?
        </button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 size={18} /> Bank transfer</CardTitle>
            <CardDescription>Transfer to our account, then submit the reference. Confirmed manually — no automatic renewal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {b.bank.iban ? (
              <div className="space-y-1.5 rounded-lg bg-muted p-3 text-sm">
                <BankRow label="Bank" value={b.bank.name} />
                <BankRow label="Title" value={b.bank.accountTitle} />
                <BankRow label="IBAN" value={b.bank.iban} onCopy={onCopy} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Bank details will appear here once configured. Contact support for transfer details.</p>
            )}
            <form onSubmit={onSubmitTransfer} className="space-y-2">
              <Label htmlFor="ref">Transfer reference / transaction ID</Label>
              <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. IBFT-123456" />
              <Button type="submit" variant="secondary" loading={submitting} className="w-full"><CheckCircle2 size={16} /> I've transferred — submit</Button>
            </form>
            <p className="text-[11px] text-muted-foreground">Bank transfers are confirmed manually and may take up to one business day.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BankRow({ label, value, onCopy }: { label: string; value: string | null; onCopy?: (v: string) => void }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        {value}
        {onCopy && <button type="button" onClick={() => onCopy(value)} className="text-muted-foreground hover:text-foreground" aria-label="Copy"><Copy size={13} /></button>}
      </span>
    </div>
  );
}
