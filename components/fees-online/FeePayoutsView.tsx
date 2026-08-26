'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useGetInstitutionsOwedQuery,
  useVerifyInstitutionPayoutAccountMutation,
  useGeneratePayoutMutation,
  useGetPayoutsQuery,
  useMarkPayoutPaidMutation,
  useGetNeedsRefundQuery,
  useResolveNeedsRefundMutation,
  useRunReconciliationMutation,
  type Payout,
} from '@/store/api/feesOnlineApi';

const statusBadge: Record<Payout['status'], { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }> = {
  pending: { variant: 'primary', label: 'Ready to pay' },
  held_unverified_account: { variant: 'warning', label: 'Held — unverified account' },
  paid: { variant: 'success', label: 'Paid' },
  failed: { variant: 'danger', label: 'Failed' },
};

export function FeePayoutsView() {
  const { data: owedRes, isLoading: owedLoading, refetch: refetchOwed } = useGetInstitutionsOwedQuery();
  const { data: payoutsRes, isLoading: payoutsLoading } = useGetPayoutsQuery();
  const { data: refundRes, isLoading: refundLoading } = useGetNeedsRefundQuery();
  const [verifyAccount, { isLoading: verifying }] = useVerifyInstitutionPayoutAccountMutation();
  const [generate, { isLoading: generating }] = useGeneratePayoutMutation();
  const [markPaid, { isLoading: marking }] = useMarkPayoutPaidMutation();
  const [resolveRefund, { isLoading: resolving }] = useResolveNeedsRefundMutation();
  const [runReconciliation, { isLoading: reconciling }] = useRunReconciliationMutation();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const handleReconcile = async () => {
    try {
      const res = await runReconciliation().unwrap();
      const { checked, settled, failed, abandoned } = res.data;
      toast.success(`Checked ${checked} — ${settled} settled, ${failed} failed, ${abandoned} abandoned`);
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Reconciliation sweep failed');
    }
  };

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [paidVia, setPaidVia] = useState('');
  const [paidReference, setPaidReference] = useState('');

  const owed = owedRes?.data ?? [];
  const payouts = payoutsRes?.data ?? [];
  const needsRefund = refundRes?.data ?? [];

  const handleResolveRefund = async (paymentId: string) => {
    if (!resolveNote.trim()) return toast.error('Enter a short note (e.g. "refunded via bank transfer")');
    try {
      await resolveRefund({ paymentId, note: resolveNote.trim() }).unwrap();
      toast.success('Marked as resolved');
      setResolvingId(null);
      setResolveNote('');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not mark as resolved');
    }
  };

  const handleVerify = async (institutionId: string) => {
    try {
      await verifyAccount(institutionId).unwrap();
      toast.success('Payout account verified');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not verify — has the institution set up a payout account?');
    }
  };

  const handleGenerate = async (institutionId: string) => {
    try {
      await generate(institutionId).unwrap();
      toast.success('Payout batch created');
      refetchOwed();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not generate payout');
    }
  };

  const handleMarkPaid = async (payoutId: string) => {
    if (!paidVia.trim()) return toast.error('Enter how you sent the money (e.g. "Bank transfer")');
    try {
      await markPaid({ payoutId, paidVia: paidVia.trim(), paidReference: paidReference.trim() || undefined }).unwrap();
      toast.success('Payout marked as paid');
      setMarkingId(null);
      setPaidVia('');
      setPaidReference('');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not mark as paid');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Payouts"
        description="Money collected online from parents (via JazzCash/EasyPaisa/Safepay) that Marksly owes back to each institution, minus the platform fee."
        actions={
          <Button variant="secondary" size="sm" loading={reconciling} onClick={handleReconcile}>
            <RefreshCw size={14} /> Run reconciliation now
          </Button>
        }
      />

      {needsRefund.length > 0 && (
        <Card className="border-danger/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger" />
            <p className="font-semibold text-foreground">Needs manual refund</p>
            <Badge variant="danger">{needsRefund.length}</Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Money that arrived at the gateway but couldn&apos;t be applied to the invoice (usually because it was already paid another way in the meantime). Refund the parent directly via the gateway, then mark it resolved here.
          </p>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Institution</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsRefund.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">{r.institutionName ?? '—'}{r.studentRollNumber ? ` · ${r.studentRollNumber}` : ''}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(r.amount)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{r.gateway}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.completedAt)}</TableCell>
                    <TableCell className="text-right">
                      {resolvingId === r.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input placeholder="Resolution note…" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className="h-8 w-40 text-xs" />
                          <Button size="sm" loading={resolving} onClick={() => handleResolveRefund(r.id)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => setResolvingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="soft" onClick={() => setResolvingId(r.id)}>Mark resolved</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-foreground">Institutions owed</p>
          <Button variant="secondary" size="sm" onClick={() => refetchOwed()}><RefreshCw size={14} /> Refresh</Button>
        </div>
        {owedLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : owed.length === 0 ? (
          <EmptyState icon={Wallet} title="Nothing owed right now" description="Successful online payments not yet batched into a payout will show up here." />
        ) : (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Institution</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Gross owed</TableHead>
                  <TableHead>Pending clawback</TableHead>
                  <TableHead>Oldest unpaid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {owed.map((o) => (
                  <TableRow key={o.institutionId}>
                    <TableCell className="font-medium text-foreground">{o.institutionName}</TableCell>
                    <TableCell className="text-muted-foreground">{o.paymentCount}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(o.gross)}</TableCell>
                    <TableCell className={o.pendingClawback > 0 ? 'text-danger' : 'text-muted-foreground'}>
                      {o.pendingClawback > 0 ? `− ${formatCurrency(o.pendingClawback)}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(o.oldestUnpaidAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" loading={verifying} onClick={() => handleVerify(o.institutionId)}>
                          Verify account
                        </Button>
                        <Button size="sm" variant="soft" loading={generating} onClick={() => handleGenerate(o.institutionId)}>
                          Generate payout
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-3 font-semibold text-foreground">Payout batches</p>
        {payoutsLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : payouts.length === 0 ? (
          <EmptyState icon={Wallet} title="No payout batches yet" />
        ) : (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Institution</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Clawback</TableHead>
                  <TableHead>Net payable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.institutionName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(p.grossCollected)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(p.platformFee)}</TableCell>
                    <TableCell className={p.clawbackAmount > 0 ? 'text-danger' : 'text-muted-foreground'}>
                      {p.clawbackAmount > 0 ? `− ${formatCurrency(p.clawbackAmount)}` : '—'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(p.netAmount)}</TableCell>
                    <TableCell><Badge variant={statusBadge[p.status].variant}>{statusBadge[p.status].label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {p.status === 'pending' && (
                        markingId === p.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input placeholder="Sent via…" value={paidVia} onChange={(e) => setPaidVia(e.target.value)} className="h-8 w-28 text-xs" />
                            <Input placeholder="Reference" value={paidReference} onChange={(e) => setPaidReference(e.target.value)} className="h-8 w-24 text-xs" />
                            <Button size="sm" loading={marking} onClick={() => handleMarkPaid(p.id)}>
                              <CheckCircle2 size={14} /> Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setMarkingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="soft" onClick={() => setMarkingId(p.id)}>
                            <Clock size={14} /> Mark as paid
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>
    </div>
  );
}
