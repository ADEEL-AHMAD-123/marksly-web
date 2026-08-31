'use client';

import { CheckCircle2, XCircle, Inbox, AlertTriangle, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  useGetPendingPaymentsQuery, useGetDisputedPaymentsQuery, useResolveDisputeMutation,
  useConfirmPaymentMutation, useRejectPaymentMutation,
  useGetNeedsReviewPaymentsQuery, useResolveNeedsReviewMutation,
  type NeedsReviewSource,
} from '@/store/api/billingApi';
import { useUpdateInstitutionMutation } from '@/store/api/superadminApi';

// Plain-English label for where a "needs review" flag came from — shown as a
// badge so a row that appears with no obvious trigger (e.g. a superadmin
// clicking Confirm on a stale pending row) has a visible origin instead of
// just an unexplained note. Keep in sync with markPaymentNeedsReview()'s
// `source` values in billing.service.ts.
const REVIEW_SOURCE_LABEL: Record<NeedsReviewSource, string> = {
  checkout_autosettle: 'Checkout (auto-settle)',
  verify_poll: 'Checkout return page',
  webhook: 'Gateway webhook',
  bank_transfer_confirm: 'Superadmin confirm click',
  auto_renewal: 'Auto-renewal cron',
};

export function PendingPaymentsView() {
  const { data, isLoading } = useGetPendingPaymentsQuery();
  const rows = data?.data ?? [];
  const { data: disputedRes } = useGetDisputedPaymentsQuery();
  const disputed = disputedRes?.data ?? [];
  const { data: needsReviewRes } = useGetNeedsReviewPaymentsQuery();
  const needsReview = needsReviewRes?.data ?? [];
  const [confirm, { isLoading: confirming }] = useConfirmPaymentMutation();
  const [reject, { isLoading: rejecting }] = useRejectPaymentMutation();
  const [resolveDispute, { isLoading: resolving }] = useResolveDisputeMutation();
  const [resolveReview, { isLoading: resolvingReview }] = useResolveNeedsReviewMutation();
  const [updateInstitution, { isLoading: suspending }] = useUpdateInstitutionMutation();
  const busy = confirming || rejecting;

  const onConfirm = async (institutionId: string, paymentId: string) => {
    try {
      const res = await confirm({ institutionId, paymentId }).unwrap();
      if (res.data.status === 'blocked_by_concurrent_payment') {
        // A different payment on the same subscription already settled this
        // billing cycle (e.g. an online payment's webhook landed at the same
        // moment) — settle()'s own guard against double-crediting caught it,
        // so this one was deliberately left as-is rather than confirmed.
        // Needs a human look, not a generic success toast.
        toast(
          'Another payment already settled this billing period — this one was left pending for manual review rather than double-crediting the subscription.',
          { icon: '⚠️', duration: 7000 }
        );
        return;
      }
      toast.success(res.data.status === 'already_confirmed' ? 'This payment was already confirmed' : 'Payment confirmed — subscription renewed');
    } catch (e: any) { toast.error(e?.data?.error?.message || 'Could not confirm'); }
  };
  const onReject = async (institutionId: string, paymentId: string) => {
    try { await reject({ institutionId, paymentId }).unwrap(); toast.success('Payment rejected'); }
    catch (e: any) { toast.error(e?.data?.error?.message || 'Could not reject'); }
  };
  const onResolveDispute = async (institutionId: string, paymentId: string) => {
    try { await resolveDispute({ institutionId, paymentId }).unwrap(); toast.success('Dispute marked as resolved'); }
    catch (e: any) { toast.error(e?.data?.error?.message || 'Could not resolve'); }
  };
  const onResolveReview = async (institutionId: string, paymentId: string) => {
    try { await resolveReview({ institutionId, paymentId }).unwrap(); toast.success('Marked as reviewed'); }
    catch (e: any) { toast.error(e?.data?.error?.message || 'Could not mark as reviewed'); }
  };
  const onSuspend = async (institutionId: string, institutionName: string) => {
    if (!window.confirm(`Suspend ${institutionName}? They'll lose access until reactivated.`)) return;
    try { await updateInstitution({ id: institutionId, body: { status: 'suspended' } }).unwrap(); toast.success('Institution suspended'); }
    catch (e: any) { toast.error(e?.data?.error?.message || 'Could not suspend'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments Needing Action"
        description="Bank transfers awaiting confirmation, disputed charges, and duplicate-charge reviews. Successful and online payments appear in Revenue and each institution's own page."
      />

      {disputed.length > 0 && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-danger"><AlertTriangle size={17} /> Disputed payments</CardTitle>
            <CardDescription>Chargebacks reported by the gateway — these need a manual decision and were not automatically reversed.</CardDescription>
          </CardHeader>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Institution</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputed.map((r) => (
                  <TableRow key={r.paymentId}>
                    <TableCell className="font-medium text-foreground">{r.institutionName}</TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(r.amount)}</TableCell>
                    <TableCell><Badge variant="neutral" className="capitalize">{r.gateway}</Badge></TableCell>
                    <TableCell className="max-w-[140px] truncate text-muted-foreground" title={r.reference ?? ''}>{r.reference ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">{r.disputeNote ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" disabled={suspending} onClick={() => onSuspend(r.institutionId, r.institutionName)}>
                          <ShieldOff size={14} /> Suspend
                        </Button>
                        <Button size="sm" variant="soft" disabled={resolving} onClick={() => onResolveDispute(r.institutionId, r.paymentId)}>
                          <CheckCircle2 size={14} /> Mark resolved
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </Card>
      )}

      {needsReview.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning"><AlertTriangle size={17} /> Needs review — possible duplicate charges</CardTitle>
            <CardDescription>
              A gateway charge genuinely went through but couldn't be automatically credited because another payment
              on the same subscription already settled that billing cycle first — likely worth a manual refund or credit check.
            </CardDescription>
          </CardHeader>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Institution</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Flagged from</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Why it's here</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsReview.map((r) => (
                  <TableRow key={r.paymentId}>
                    <TableCell className="font-medium text-foreground">{r.institutionName}</TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(r.amount)}</TableCell>
                    <TableCell><Badge variant="neutral" className="capitalize">{r.gateway}</Badge></TableCell>
                    <TableCell className="max-w-[140px] truncate text-muted-foreground" title={r.gatewayTxnId ? `${r.reference ?? '—'} (gateway txn ${r.gatewayTxnId})` : (r.reference ?? '')}>{r.reference ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="whitespace-nowrap">{r.reviewSource ? REVIEW_SOURCE_LABEL[r.reviewSource] : 'Unknown'}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">{r.reviewNote ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="soft" disabled={resolvingReview} onClick={() => onResolveReview(r.institutionId, r.paymentId)}>
                        <CheckCircle2 size={14} /> Mark reviewed
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Inbox} title="Nothing pending" description="Confirmed and online payments appear in Revenue." /></Card>
      ) : (
        <Card className="p-0">
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Institution</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.paymentId}>
                    <TableCell className="font-medium text-foreground">{r.institutionName}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{r.planType ?? r.description ?? '—'}</TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(r.amount)}</TableCell>
                    <TableCell><Badge variant="neutral" className="capitalize">{r.gateway}</Badge></TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground" title={r.reference ?? ''}>{r.reference ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="soft" disabled={busy} onClick={() => onConfirm(r.institutionId, r.paymentId)}><CheckCircle2 size={15} /> Confirm</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReject(r.institutionId, r.paymentId)}><XCircle size={15} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </Card>
      )}
    </div>
  );
}
