'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Download, Wallet, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { formatCurrency, formatDate } from '@/lib/utils';
import { openAuthedPdf } from '@/lib/downloadFile';
import type { FeeItem } from '@/store/api/portalApi';
import type { RootState } from '@/store';

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

/** Shared by both the student and parent portals — Marksly never collects
 *  or moves this money, so there is no "pay online" action here at all.
 *  A parent/student only ever sees what's due and can download the exact,
 *  immutable slip (with the institution's own bank/challan details) to pay
 *  directly; once the institution's accountant records that payment, the
 *  status here updates from the same PaymentRecord an admin would see. */
export function FeesList({
  data,
  isLoading,
  childId,
}: {
  data?: FeeItem[];
  isLoading: boolean;
  /** Present only from the parent portal (viewing a specific child's fees);
   *  undefined for the student portal, which hits the `/student/fees/...`
   *  routes for the logged-in student themselves. */
  childId?: string;
}) {
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  const totalDue = data.reduce((s, f) => s + Math.max(0, f.balance), 0);
  if (data.length === 0) return <Card><EmptyState icon={Wallet} title="No fee invoices yet" /></Card>;

  const handleDownloadSlip = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const path = childId
        ? `/me/children/${childId}/fees/${invoiceId}/slip`
        : `/me/student/fees/${invoiceId}/slip`;
      await openAuthedPdf(path, accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate the fee slip');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloadingReceiptId(paymentId);
    try {
      const path = childId
        ? `/me/children/${childId}/fees/payments/${paymentId}/receipt`
        : `/me/student/fees/payments/${paymentId}/receipt`;
      await openAuthedPdf(path, accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate the receipt');
    } finally {
      setDownloadingReceiptId(null);
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
              <li key={f.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{f.structureName ?? 'Fee'}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(f.dueDate)} · {formatCurrency(f.netAmount)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant={feeBadgeFor(f.status).variant}>{feeBadgeFor(f.status).label}</Badge>
                      {f.balance > 0 && <p className="mt-1 text-xs text-muted-foreground">Bal {formatCurrency(f.balance)}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="soft"
                      loading={downloadingId === f.id}
                      onClick={() => handleDownloadSlip(f.id)}
                    >
                      <Download size={14} /> Slip
                    </Button>
                  </div>
                </div>
                {f.payments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-success-soft/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      {f.payments.length === 1 ? '1 payment recorded' : `${f.payments.length} payments recorded`}
                    </p>
                    <div className="ml-auto flex flex-wrap gap-2">
                      {f.payments.map((p) => (
                        <Button
                          key={p.id}
                          size="sm"
                          variant="outline"
                          loading={downloadingReceiptId === p.id}
                          onClick={() => handleDownloadReceipt(p.id)}
                        >
                          <Receipt size={13} /> Receipt · {formatCurrency(p.amountPaid)} ({formatDate(p.paymentDate)})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <InfoNote title="How to pay">
        <p>
          Download the slip above — it shows the institution's own bank account details. Pay directly by bank
          transfer or deposit, then keep your receipt; the institution's office will record it once received.
        </p>
      </InfoNote>
    </div>
  );
}
