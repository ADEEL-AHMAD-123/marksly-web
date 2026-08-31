'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetMyBillingQuery, useGetBillingPlansQuery, useSelectPlanMutation,
  useBillingCheckoutMutation, useVerifyPaymentMutation, useSubmitBankTransferMutation,
  useLazyGetMyPaymentsQuery, useStartAutoRenewMutation, useConfirmAutoRenewMutation, useDisableAutoRenewMutation,
  type Gateway, type BillingPayment,
} from '@/store/api/billingApi';
import { PAYMENTS_PAGE_SIZE, gatewayLabel, type Step } from './billing.constants';
import { Stepper } from './BillingStepper';
import { SummaryStep } from './BillingSummaryStep';
import { PlansStep } from './BillingPlansStep';
import { PaymentStep } from './BillingPaymentStep';

export function BillingView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading, isError, refetch } = useGetMyBillingQuery();
  const b = data?.data;
  const { data: plansRes } = useGetBillingPlansQuery();
  const plans = plansRes?.data ?? [];
  const [selectPlan, { isLoading: selectingPlan }] = useSelectPlanMutation();
  const [checkout, { isLoading: checkingOut }] = useBillingCheckoutMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [submitTransfer, { isLoading: submitting }] = useSubmitBankTransferMutation();
  const [startAutoRenew, { isLoading: startingAutoRenew }] = useStartAutoRenewMutation();
  const [confirmAutoRenew] = useConfirmAutoRenewMutation();
  const [disableAutoRenew, { isLoading: disablingAutoRenew }] = useDisableAutoRenewMutation();
  const [reference, setReference] = useState('');
  const [step, setStep] = useState<Step>('summary');
  const [reconciling, setReconciling] = useState(false);
  const verifiedRef = useRef(false);

  // "Load more" payment history — page 1 already came inline with
  // getMyBilling; this appends subsequent pages at the same page size.
  const [extraPayments, setExtraPayments] = useState<BillingPayment[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(2);
  const [fetchPayments, { isFetching: loadingMorePayments }] = useLazyGetMyPaymentsQuery();
  const loadMorePayments = async () => {
    const res = await fetchPayments({ page: paymentsPage, limit: PAYMENTS_PAGE_SIZE }).unwrap();
    setExtraPayments((prev) => [...prev, ...res.data.items]);
    setPaymentsPage((p) => p + 1);
  };

  // Reconciliation fallback: Safepay appends ?tracker=... to our return URL
  // when the payer comes back from the hosted checkout page. Don't rely on
  // the webhook alone (it can be delayed, or never configured) — actively
  // check the real status here so the admin isn't stuck looking at "pending"
  // after a payment that actually succeeded.
  useEffect(() => {
    const tracker = searchParams.get('tracker');
    if (!tracker || verifiedRef.current) return;
    verifiedRef.current = true;
    setReconciling(true);
    // Our own returnUrl for the save-card flow carries `?autorenew=1` so we
    // can tell "returning from a one-off payment" apart from "returning
    // from saving a card for auto-renewal" — they need different endpoints
    // and different confirmation messages even though both come back with
    // the same `?tracker=...` shape from Safepay.
    const isAutoRenewSetup = searchParams.get('autorenew') === '1';

    (async () => {
      if (isAutoRenewSetup) {
        try {
          const res = await confirmAutoRenew({ gatewayTxnId: tracker }).unwrap();
          if (res.data.ok) {
            toast.success('Auto-renewal enabled — your card is saved securely with Safepay');
          } else {
            toast.error(res.data.reason || 'Card setup did not complete — please try again');
          }
        } catch (e: any) {
          toast.error(e?.data?.error?.message || 'Card setup did not complete — please try again');
        }
        setReconciling(false);
        router.replace(pathname);
        return;
      }

      // A couple of quick retries in case the gateway's own record hasn't
      // caught up yet (a few seconds' lag is normal right after redirect).
      let paidSuccessfully = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await verifyPayment({ gateway: 'safepay', gatewayTxnId: tracker }).unwrap();
          if (res.data.status === 'success') {
            toast.success('Payment received — subscription updated');
            paidSuccessfully = true;
            break;
          }
          if (res.data.status === 'failed') {
            toast.error('That payment did not complete — please try again');
            break;
          }
          if (res.data.status === 'refunded') {
            toast('This payment was refunded', { icon: 'ℹ️' });
            break;
          }
        } catch {
          // keep retrying — the payment row may not be visible yet
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      }

      // Combining the charge with a card-save in one Safepay session isn't
      // possible (see billing.service.ts's checkout() for the two real
      // production errors that ruled it out) — but the institution
      // shouldn't have to go find a separate "Enable auto-renewal" button on
      // their own to get the same end result. Chain straight into it
      // automatically right after a successful manual payment, as long as
      // they aren't already enrolled — a fresh `getMyBilling` read (not the
      // possibly-stale `b` from before this redirect) decides that.
      if (paidSuccessfully) {
        try {
          const fresh = await refetch().unwrap();
          const freshBilling = fresh.data;
          if (freshBilling.autoRenewalAvailable && !freshBilling.autoRenew) {
            toast('Saving your card for automatic renewals…', { icon: '💳', duration: 3000 });
            const auto = await startAutoRenew().unwrap();
            if (auto.data.redirectUrl) {
              window.location.href = auto.data.redirectUrl;
              return; // navigating away — skip the router.replace below
            }
            // The call succeeded but came back with nothing to redirect to —
            // surface it instead of silently falling through, since this is
            // exactly the kind of gap that otherwise looks like "nothing
            // happened" from the institution's side.
            console.error('[billing] startAutoRenew succeeded but returned no redirectUrl', auto);
            toast('Payment succeeded, but we could not start the automatic card-save — you can save one manually below.', { icon: '⚠️', duration: 6000 });
          }
        } catch (autoErr: any) {
          // Payment itself already succeeded and is fully recorded either
          // way — this can't block that. But log/report it (rather than the
          // previous fully-silent swallow) so a real failure here is
          // actually visible instead of just quietly falling back to the
          // manual "Save a card" button with no explanation.
          console.error('[billing] auto-chain card save failed after successful payment:', autoErr);
          toast(
            `Payment succeeded, but we couldn't automatically save your card${autoErr?.data?.error?.message ? ` (${autoErr.data.error.message})` : ''} — you can save one manually below.`,
            { icon: '⚠️', duration: 7000 }
          );
        }
      }

      setReconciling(false);
      router.replace(pathname);
    })();
  }, [searchParams, verifyPayment, confirmAutoRenew, refetch, startAutoRenew, router, pathname]);

  if (isLoading || reconciling) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing & Subscription" description="Your Marksly plan and payments." />
        {reconciling && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft/40 px-4 py-3 text-sm text-primary">
            <RefreshCw size={16} className="animate-spin" /> Confirming your payment with the gateway…
          </div>
        )}
        <Card className="p-5"><Skeleton className="h-48 w-full" /></Card>
      </div>
    );
  }

  if (isError || !b) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing & Subscription" description="Your Marksly plan and payments." />
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle size={28} className="text-danger" />
          <p className="text-sm font-medium text-foreground">Couldn't load your billing details</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}><RefreshCw size={14} /> Retry</Button>
        </Card>
      </div>
    );
  }

  const free = b.planPrice <= 0;
  const needsPayment = !free && b.status !== 'active' && !b.pendingPlan;
  // Informational only — nothing on the backend enforces this, so it's
  // purely a nudge to pick a paid plan once the welcome trial window has
  // passed while still on the free plan. Never blocks anything.
  const trialExpired = free && !!b.trialEndsAt && new Date(b.trialEndsAt) < new Date();
  const liveGateways = (Object.keys(gatewayLabel) as Gateway[]).filter((g) => b.online[g]);

  const payOnline = async (gateway: Gateway) => {
    try {
      const res = await checkout({ gateway }).unwrap();
      // Never assume success by default — only two outcomes count as "ok":
      // the gateway actually settled it (mock/dev), or it handed back a real
      // redirect to complete payment on. Anything else is an error, even if
      // the request itself didn't throw.
      if (res.data.settled) {
        toast.success('Payment received — subscription updated');
        // Same auto-chain as the real-redirect return path (see the
        // reconciliation useEffect above) — only reachable here for a
        // gateway that settles instantly (mock/dev), but kept consistent so
        // an institution is never left needing to find a separate
        // "Enable auto-renewal" action on their own.
        if (gateway === 'safepay' && b.autoRenewalAvailable && !b.autoRenew) {
          try {
            const auto = await startAutoRenew().unwrap();
            if (auto.data.redirectUrl) {
              toast('Saving your card for automatic renewals…', { icon: '💳', duration: 3000 });
              window.location.href = auto.data.redirectUrl;
              return;
            }
          } catch (autoErr: any) {
            // Non-fatal — payment already succeeded regardless. Logged (not
            // silently swallowed) so a real failure here is actually
            // visible instead of just quietly landing back on the manual
            // "Save a card" button with no explanation.
            console.error('[billing] auto-chain card save failed after successful payment:', autoErr);
            toast(
              `Payment succeeded, but we couldn't automatically save your card${autoErr?.data?.error?.message ? ` (${autoErr.data.error.message})` : ''} — you can save one manually below.`,
              { icon: '⚠️', duration: 7000 }
            );
          }
        }
        setStep('summary');
        return;
      }
      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      toast.error('Could not start payment — please try again or use bank transfer');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not start payment');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return toast.error('Enter the transfer reference / transaction ID');
    try {
      await submitTransfer({ reference: reference.trim() }).unwrap();
      toast.success('Submitted — we\'ll confirm and update your subscription shortly');
      setReference('');
      setStep('summary');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not submit');
    }
  };

  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success('Copied'); };

  const choosePlan = async (planKey: string) => {
    // Tell the admin up front, before even attempting the request, that
    // this downgrade won't go through — the backend now hard-blocks it
    // (selectPlan() throws DOWNGRADE_EXCEEDS_STUDENT_LIMIT) rather than
    // scheduling it and grandfathering the overage in, since that was the
    // exact upgrade-then-downgrade loophole this check exists to close. No
    // "continue anyway" option here — there's nothing to continue into.
    const targetPlan = plans.find((p) => p.key === planKey);
    const activeCount = b?.activeStudentCount ?? 0;
    if (targetPlan && targetPlan.studentsLimit > 0 && activeCount > targetPlan.studentsLimit) {
      const over = activeCount - targetPlan.studentsLimit;
      toast.error(
        `Can't switch to ${targetPlan.name}: you have ${activeCount} active students, ${over} more than this plan allows. Reduce active students to ${targetPlan.studentsLimit} or fewer first.`,
        { duration: 7000 }
      );
      return;
    }

    try {
      const res = await selectPlan({ planKey }).unwrap();
      const { effective } = res.data;
      if (effective === 'pending_payment') {
        toast.success('Plan selected — pay to activate it');
        setStep('payment'); // walk the admin straight to payment
      } else if (effective === 'next_renewal') {
        toast.success('Got it — this takes effect at your next renewal, no payment needed now');
        setStep('summary');
      } else {
        toast.success('Plan updated');
        setStep('summary');
      }
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not update plan');
    }
  };

  const onEnableAutoRenew = async () => {
    try {
      const res = await startAutoRenew().unwrap();
      // Same "never assume success" rule as payOnline() — this only ever
      // hands back a redirect to Safepay's card-save flow, there's no
      // auto-settled shortcut for saving a card.
      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      toast.error('Could not start card setup — please try again');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not start card setup');
    }
  };

  const onDisableAutoRenew = async () => {
    if (!window.confirm('Turn off auto-renewal? Your saved card will be removed and you\'ll need to pay manually going forward.')) return;
    try {
      await disableAutoRenew().unwrap();
      toast.success('Auto-renewal turned off');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not turn off auto-renewal');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Subscription" description="Your Marksly plan and payments." />
      <Stepper step={step} />

      {step === 'summary' && (
        <SummaryStep
          b={b}
          free={free}
          needsPayment={needsPayment}
          trialExpired={trialExpired}
          onChangePlan={() => setStep('plans')}
          onPay={() => setStep('payment')}
          onCancelScheduled={() => choosePlan(b.plan)}
          extraPayments={extraPayments}
          onLoadMorePayments={loadMorePayments}
          loadingMorePayments={loadingMorePayments}
          onEnableAutoRenew={onEnableAutoRenew}
          onDisableAutoRenew={onDisableAutoRenew}
          startingAutoRenew={startingAutoRenew}
          disablingAutoRenew={disablingAutoRenew}
        />
      )}

      {step === 'plans' && (
        <PlansStep
          plans={plans}
          currentPlan={b.plan}
          pendingPlan={b.pendingPlan}
          scheduledPlan={b.scheduledPlan}
          selecting={selectingPlan}
          onBack={() => setStep('summary')}
          onChoose={choosePlan}
        />
      )}

      {step === 'payment' && (
        <PaymentStep
          b={b}
          liveGateways={liveGateways}
          checkingOut={checkingOut}
          submitting={submitting}
          reference={reference}
          setReference={setReference}
          onBack={() => setStep('summary')}
          onPayOnline={payOnline}
          onSubmitTransfer={submit}
          onCopy={copy}
        />
      )}
    </div>
  );
}
