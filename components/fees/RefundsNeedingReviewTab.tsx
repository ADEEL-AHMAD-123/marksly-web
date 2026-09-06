'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
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
  useGetMyRefundsNeedingReviewQuery,
  useResolveRefundLedgerReviewMutation,
} from '@/store/api/feesOnlineApi';

export function RefundsNeedingReviewTab() {
  const { data, isLoading } = useGetMyRefundsNeedingReviewQuery();
  const [resolve, { isLoading: resolving }] = useResolveRefundLedgerReviewMutation();
  const items = data?.data ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const handleResolve = async (paymentId: string, action: 'reversed' | 'kept_as_paid') => {
    if (!note.trim()) return toast.error('Add a short note explaining this decision');
    try {
      await resolve({ paymentId, action, note: note.trim() }).unwrap();
      toast.success(action === 'reversed' ? 'Invoice marked unpaid again' : 'Invoice kept as paid');
      setActiveId(null);
      setNote('');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not resolve this refund');
    }
  };

  if (isLoading) return <Card className="p-5"><Skeleton className="h-40 w-full" /></Card>;

  if (items.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={AlertTriangle}
          title="No refunds waiting on a decision"
          description="When an online payment gets refunded, it lands here so you can decide whether the related invoice should go back to unpaid or stay marked as paid."
        />
      </Card>
    );
  }

  return (
    <Card className="border-warning/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={18} className="text-warning" />
        <p className="font-semibold text-foreground">Refunds needing a ledger decision</p>
        <Badge variant="warning">{items.length}</Badge>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        These online payments were refunded after the invoice was marked paid. A refund never automatically reverses the invoice — choose whether to put the invoice back to unpaid, or keep it as paid (e.g. if the family paid another way instead).
      </p>
      <TableWrapper>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Student</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Refunded</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.studentRollNumber ?? '—'}</TableCell>
                <TableCell className="text-foreground">{formatCurrency(r.amount)}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{r.gateway}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.refundedAt)}</TableCell>
                <TableCell className="text-right">
                  {activeId === r.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input placeholder="Note…" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 w-36 text-xs" />
                      <Button size="sm" variant="soft" loading={resolving} onClick={() => handleResolve(r.id, 'reversed')}>Reverse invoice</Button>
                      <Button size="sm" loading={resolving} onClick={() => handleResolve(r.id, 'kept_as_paid')}>Keep as paid</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActiveId(null); setNote(''); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="soft" onClick={() => setActiveId(r.id)}>Decide</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </Card>
  );
}
