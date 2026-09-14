'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, Wallet, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FeeItem } from '@/store/api/portalApi';
import {
  useInitiateOnlineCheckoutMutation, useGetGatewayStatusQuery, useVerifyOnlinePaymentMutation, type OnlineGateway,
} from '@/store/api/feesOnlineApi';
import { RaastQrDialog } from '@/components/billing/RaastQrDialog';

/** Watches for `?fee_ref=` on the current URL (added to the gateway's
 *  returnUrl by initiateCheckout) and confirms the payment's outcome the
 *  moment the payer lands back on this page, instead of leaving them
 *  staring at a stale invoice list until the webhook eventually lands.
 *  Strips the param afterward so a page refresh doesn't re-verify. */
function useVerifyOnReturn() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [verify] = useVerifyOnlinePaymentMutation();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('fee_ref');
    if (!ref || handledRef.current === ref) return;
    handledRef.current = ref;

    verify(ref)
      .unwrap()
      .then((res) => {
        const status = res.data.status;
        if (status === 'succeeded') toast.success('Payment received — thank you!');
        else if (status === 'failed') toast.error('The payment was not successful');
        else if (status === 'refunded') toast('This payment was refunded');
        else toast('Payment is still processing — this page will update shortly');
      })
      .catch(() => toast.error('Could not confirm the payment status — check back in a moment'))
      .finally(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('fee_ref');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}

const GATEWAY_LABEL: Record<OnlineGateway, string> = {
  safepay: 'Card / Safepay',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  raast: 'Raast (bank/wallet)',
};

/** Every gateway that's actually configured server-side, in a stable
 *  preferred order — never fall back to hardcoding one that might silently
 *  mock-settle in an environment where it isn't really live. */
function listLiveGateways(status?: { safepay: boolean; jazzcash: boolean; easypaisa: boolean; raast: boolean }): OnlineGateway[] {
  if (!status) return [];
  return (['safepay', 'jazzcash', 'easypaisa', 'raast'] as const).filter((g) => status[g]);
}

const feeBadge = {
  paid: { variant: 'success' as const, label: 'Paid' },
  partial: { variant: 'primary' as const, label: 'Partial' },
  pending: { variant: 'warning' as const, label: 'Pending' },
  overdue: { variant: 'danger' as const, label: 'Overdue' },
  waived: { variant: 'neutral' as const, label: 'Waived' },
};
// Defensive fallback -- a status this map hasn't been updated for must
// never crash the fee list, same guard as InvoicesTab.tsx/
// StudentDashboardFeesNudge.tsx.
const feeBadgeFor = (status: keyof typeof feeBadge) => feeBadge[status] ?? feeBadge.pending;

export function FeesList({ data, isLoading }: { data?: FeeItem[]; isLoading: boolean }) {
  useVerifyOnReturn();
  const [checkout, { isLoading: paying }] = useInitiateOnlineCheckoutMutation();
  const [verifyOnlinePayment] = useVerifyOnlinePaymentMutation();
  const { data: gatewayRes } = useGetGatewayStatusQuery();
  const liveGateways = listLiveGateways(gatewayRes?.data);
  const [payingId, setPayingId] = useState<string | null>(null);
  // Same reasoning as BillingView.tsx's raastQr state — Raast has no
  // redirect page, so a QR is shown here and polled by the checkout
  // `reference` (not gatewayTxnId — verifyOnlinePayment looks up by
  // reference, which we already have from the checkout response).
  const [raastQr, setRaastQr] = useState<{ code: string | null; amount: number } | null>(null);
  const raastPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (raastPollRef.current) clearInterval(raastPollRef.current); };
  }, []);

  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  const totalDue = data.reduce((s, f) => s + Math.max(0, f.balance), 0);
  if (data.length === 0) return <Card><EmptyState icon={Wallet} title="No fee invoices yet" /></Card>;

  const startRaastPoll = (reference: string) => {
    if (raastPollRef.current) clearInterval(raastPollRef.current);
    const startedAt = Date.now();
    raastPollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > 10 * 60_000) {
        if (raastPollRef.current) clearInterval(raastPollRef.current);
        return;
      }
      try {
        const res = await verifyOnlinePayment(reference).unwrap();
        if (res.data.status === 'succeeded') {
          if (raastPollRef.current) clearInterval(raastPollRef.current);
          setRaastQr(null);
          toast.success('Payment received — thank you!');
        } else if (res.data.status === 'failed') {
          if (raastPollRef.current) clearInterval(raastPollRef.current);
          setRaastQr(null);
          toast.error('The payment was not successful');
        }
      } catch {
        // Transient error — next tick retries.
      }
    }, 4000);
  };

  const handlePayOnline = async (invoiceId: string, gateway: OnlineGateway, balance: number) => {
    setPayingId(invoiceId);
    try {
      const res = await checkout({ invoiceId, gateway }).unwrap();
      if (res.data.settled) {
        toast.success('Payment complete');
      } else if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else if (res.data.qrCode) {
        setRaastQr({ code: res.data.qrCode, amount: balance });
        startRaastPoll(res.data.reference);
      } else {
        toast.error('Could not start payment — try again');
      }
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not start online payment');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">Total outstanding</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalDue)}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-soft text-warning"><Wallet size={24} /></span>
      </Card>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {data.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{f.structureName ?? 'Fee'}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(f.dueDate)} · {formatCurrency(f.netAmount)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge variant={feeBadgeFor(f.status).variant}>{feeBadgeFor(f.status).label}</Badge>
                    {f.balance > 0 && <p className="mt-1 text-xs text-muted-foreground">Bal {formatCurrency(f.balance)}</p>}
                  </div>
                  {/* balance is already 0 for a waived invoice (see
                      portal.service.ts's feesFor()), but excluding
                      'waived' explicitly here too means a stale cached
                      value can never offer a payment button that the
                      backend would reject with a confusing 409 anyway. */}
                  {f.balance > 0 && f.status !== 'waived' && liveGateways.length === 1 && (
                    <Button
                      size="sm"
                      variant="soft"
                      loading={paying && payingId === f.id}
                      onClick={() => handlePayOnline(f.id, liveGateways[0], f.balance)}
                    >
                      <CreditCard size={14} /> Pay online
                    </Button>
                  )}
                  {f.balance > 0 && f.status !== 'waived' && liveGateways.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="soft" loading={paying && payingId === f.id}>
                          <CreditCard size={14} /> Pay online <ChevronDown size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {liveGateways.map((g) => (
                          <DropdownMenuItem key={g} onClick={() => handlePayOnline(f.id, g, f.balance)}>
                            {GATEWAY_LABEL[g]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <RaastQrDialog
        open={!!raastQr}
        onClose={() => {
          if (raastPollRef.current) clearInterval(raastPollRef.current);
          setRaastQr(null);
        }}
        qrCode={raastQr?.code ?? null}
        amountLabel={formatCurrency(raastQr?.amount ?? 0)}
      />
    </div>
  );
}
