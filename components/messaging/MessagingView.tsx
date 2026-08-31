'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  MessageSquare, Send, Info, AlertCircle, Wallet, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { getErrorCode, getErrorMessage } from '@/lib/get-error-message';
import {
  useGetMessagingStatusQuery, useGetMessageLogQuery, useSendMessageMutation,
  useGetWhatsappCreditsQuery, type Channel,
} from '@/store/api/messagingApi';
import { useWhatsappCreditsCheckoutMutation, useVerifyPaymentMutation } from '@/store/api/billingApi';

const statusBadge: Record<string, 'success' | 'danger' | 'neutral'> = {
  sent: 'success', failed: 'danger', mock: 'neutral',
};

// Fixed WhatsApp credit pack — no catalog to fetch, only one size exists.
const CREDITS_PACK_LABEL = '500 credits for Rs 1,000';
const CREDITS_PACK_GATEWAY = 'safepay' as const;
// Our own return-URL query param for this flow's redirect-based checkout —
// deliberately distinct from BillingView's `?tracker=` so the two
// reconciliation flows never collide if a payer somehow lands on one page
// carrying the other's leftover query string.
const CREDITS_TRACKER_PARAM = 'wa_credits_tracker';

export function MessagingView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: statusRes } = useGetMessagingStatusQuery();
  const status = statusRes?.data;
  const { data: logRes, isLoading } = useGetMessageLogQuery({ limit: 25 });
  const logs = logRes?.data ?? [];
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();

  const [channel, setChannel] = useState<Channel>('sms');
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [message, setMessage] = useState('');

  const isMock = status ? status[channel] === 'mock' : false;
  const inputCls = 'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const parseRecipients = () =>
    recipientsRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const recipientCount = parseRecipients().length;

  // ─── WhatsApp credit balance ───────────────────────────────────────────
  // Only fetched while the WhatsApp channel is actually selected — SMS isn't
  // metered, no reason to hit this endpoint otherwise.
  const {
    data: creditsRes, isFetching: loadingCredits, refetch: refetchCredits,
  } = useGetWhatsappCreditsQuery(undefined, { skip: channel !== 'whatsapp' });
  const credits = creditsRes?.data;
  const totalAvailable = credits?.totalAvailable ?? 0;
  const overCreditLimit = channel === 'whatsapp' && !!credits && recipientCount > totalAvailable;

  const [checkoutCredits, { isLoading: buyingCredits }] = useWhatsappCreditsCheckoutMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [reconcilingCredits, setReconcilingCredits] = useState(false);
  const verifiedCreditsRef = useRef(false);

  // Reconciliation fallback for the redirect-based gateways, mirroring
  // BillingView's own `?tracker=` handling exactly (same "a couple of quick
  // retries" pattern) — kept as a separate self-contained flow rather than
  // folding into BillingView's effect because there's no reliable signal in
  // verifyPayment()'s response to tell "this tracker was a plan payment" from
  // "this tracker was a credit-pack purchase", and BillingView's effect is
  // already wired to plan-specific side effects (auto-renewal chaining,
  // `b`/`plans` state) that don't apply here.
  useEffect(() => {
    const tracker = searchParams.get(CREDITS_TRACKER_PARAM);
    if (!tracker || verifiedCreditsRef.current) return;
    verifiedCreditsRef.current = true;
    setReconcilingCredits(true);

    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await verifyPayment({ gateway: CREDITS_PACK_GATEWAY, gatewayTxnId: tracker }).unwrap();
          if (res.data.status === 'success') {
            toast.success('Payment received — credits added to your balance');
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
      refetchCredits();
      setReconcilingCredits(false);
      router.replace(pathname);
    })();
  }, [searchParams, verifyPayment, refetchCredits, router, pathname]);

  const buyCredits = async () => {
    try {
      const res = await checkoutCredits({ gateway: CREDITS_PACK_GATEWAY }).unwrap();
      // Never assume success without a redirectUrl or settled:true — same
      // rule as BillingView's payOnline().
      if (res.data.settled) {
        toast.success('Payment received — credits added to your balance');
        refetchCredits();
        return;
      }
      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      toast.error('Could not start payment — please try again');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not start payment'));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = parseRecipients();
    if (recipients.length === 0) return toast.error('Add at least one recipient');
    if (!message.trim()) return toast.error('Enter a message');
    if (overCreditLimit) return toast.error('Not enough WhatsApp credits for this many recipients');
    try {
      const res = await sendMessage({ channel, recipients, message: message.trim() }).unwrap();
      const d = res.data;
      toast.success(`${d.sent}/${d.total} sent via ${d.provider}${d.failed ? ` · ${d.failed} failed` : ''}`);
      setMessage('');
      setRecipientsRaw('');
    } catch (err: any) {
      if (getErrorCode(err) === 'INSUFFICIENT_WHATSAPP_CREDITS') {
        toast.error(getErrorMessage(err, 'Not enough WhatsApp credits to send this message'));
        refetchCredits();
        return;
      }
      toast.error(getErrorMessage(err, 'Could not send'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Messaging" description="Send SMS and WhatsApp messages to parents and staff." />

      {reconcilingCredits && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft/40 px-4 py-3 text-sm text-primary">
          <RefreshCw size={16} className="animate-spin" /> Confirming your credits payment with the gateway…
        </div>
      )}

      {status && (
        <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${isMock ? 'border-warning/30 bg-warning-soft text-warning' : 'border-success/30 bg-success-soft text-success'}`}>
          {isMock ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <Info size={17} className="mt-0.5 shrink-0" />}
          <div>
            {isMock ? (
              <p><span className="font-medium">Test mode.</span> No provider keys detected for {channel.toUpperCase()} — messages are logged, not delivered. Add provider keys (Twilio, Meta WhatsApp, or Jazz SMS) to go live.</p>
            ) : (
              <p>Live — SMS via <span className="font-medium">{status.sms}</span>, WhatsApp via <span className="font-medium">{status.whatsapp}</span>.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Compose */}
        <Card className="p-5 lg:col-span-2">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Channel</Label>
              <select className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            {channel === 'whatsapp' && (
              <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3">
                {loadingCredits ? (
                  <Skeleton className="h-5 w-40" />
                ) : credits ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Wallet size={15} className="text-muted-foreground" />
                        {totalAvailable.toLocaleString()} credits remaining
                      </p>
                      <Button type="button" size="sm" variant="secondary" loading={buyingCredits} onClick={buyCredits}>
                        Buy 500 credits — Rs 1,000
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground" title="Monthly bundle allowance plus any purchased top-ups">
                      {credits.bundleRemaining.toLocaleString()} of {credits.bundleAllowance.toLocaleString()} free this month + {credits.purchasedBalance.toLocaleString()} purchased
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Could not load WhatsApp credit balance.</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="recipients">Recipients</Label>
              <textarea
                id="recipients"
                value={recipientsRaw}
                onChange={(e) => setRecipientsRaw(e.target.value)}
                rows={4}
                placeholder="03001234567, 03007654321 — one per line or comma-separated"
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">{recipientCount} recipient(s)</p>
              {overCreditLimit && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  Only {totalAvailable.toLocaleString()} WhatsApp credit(s) available — reduce recipients or buy more credits before sending.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Type your message…"
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">{message.length}/1000</p>
            </div>
            <Button type="submit" loading={sending} disabled={overCreditLimit} className="w-full"><Send size={16} /> Send</Button>
          </form>
        </Card>

        {/* Log */}
        <Card className="p-5 lg:col-span-3">
          <p className="mb-3 text-sm font-semibold text-foreground">Recent messages</p>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : logs.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No messages yet" description="Sent messages will appear here." />
          ) : (
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>To</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-foreground">{m.to}</TableCell>
                      <TableCell className="uppercase text-xs text-muted-foreground">{m.channel}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground" title={m.message}>{m.message}</TableCell>
                      <TableCell><Badge variant={statusBadge[m.status]}>{m.status}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </Card>
      </div>
    </div>
  );
}
