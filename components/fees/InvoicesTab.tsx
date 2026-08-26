'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft, ChevronRight, AlertCircle, FileText, X, Wallet, RefreshCw, Receipt, Plus, Minus, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { openAuthedPdf } from '@/lib/downloadFile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useGetInvoicesQuery,
  useRecordPaymentMutation,
  useRunBillingMutation,
  useGetInvoiceDetailQuery,
  useAdjustInvoiceMutation,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from '@/store/api/feesApi';

const statusBadge: Record<InvoiceStatus, { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  partial: { variant: 'primary', label: 'Partial' },
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'danger', label: 'Overdue' },
};

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'challan', label: 'Challan' },
];

const PAGE_SIZE = 20;

export function InvoicesTab() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [collecting, setCollecting] = useState<Invoice | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const debounced = useDebounce(query, 350);
  const [runBilling, { isLoading: billingLoading }] = useRunBillingMutation();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrintSlip = async (invoiceId: string) => {
    setPrintingId(invoiceId);
    try {
      await openAuthedPdf(`/fees/invoices/${invoiceId}/slip`, accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate slip');
    } finally {
      setPrintingId(null);
    }
  };

  const handleRunBilling = async () => {
    const now = new Date();
    try {
      const res = await runBilling({ month: now.getMonth() + 1, year: now.getFullYear() }).unwrap();
      toast.success(`Billing done — ${res.data.created} invoice(s) created across ${res.data.structures} structure(s)`);
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not run billing');
    }
  };

  const { data, isLoading, isFetching, isError, refetch } = useGetInvoicesQuery({
    page,
    limit: PAGE_SIZE,
    search: debounced || undefined,
    status: status === 'all' ? undefined : (status as InvoiceStatus),
  });

  const invoices = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Search student or roll number…"
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={handleRunBilling} loading={billingLoading} className="sm:w-auto">
            <RefreshCw size={16} /> Run monthly billing
          </Button>
        </div>
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title="Couldn't load invoices" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : invoices.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No invoices found" description="Generate invoices from a fee structure to get started." /></Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          {/* Desktop */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{inv.studentName}</p>
                        <p className="text-xs text-muted-foreground">{inv.rollNumber}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inv.structureName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-foreground">{formatCurrency(inv.netAmount)}</TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(inv.balance)}</TableCell>
                      <TableCell><Badge variant={statusBadge[inv.status].variant}>{statusBadge[inv.status].label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" loading={printingId === inv.id} onClick={() => handlePrintSlip(inv.id)}>
                            <Printer size={14} /> Slip
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDetailId(inv.id)}>Details</Button>
                          {inv.status !== 'paid' && (
                            <Button size="sm" variant="soft" onClick={() => setCollecting(inv)}>Collect</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {invoices.map((inv) => (
              <Card key={inv.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{inv.studentName}</p>
                    <p className="text-xs text-muted-foreground">{inv.rollNumber} · {inv.structureName ?? '—'}</p>
                  </div>
                  <Badge variant={statusBadge[inv.status].variant}>{statusBadge[inv.status].label}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Balance {formatCurrency(inv.balance)}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" loading={printingId === inv.id} onClick={() => handlePrintSlip(inv.id)}>
                      <Printer size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(inv.id)}>Details</Button>
                    {inv.status !== 'paid' && (
                      <Button size="sm" variant="soft" onClick={() => setCollecting(inv)}>Collect</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <CollectPaymentDrawer invoice={collecting} onClose={() => setCollecting(null)} />
      <InvoiceDetailDrawer invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

const paymentSchema = z.object({
  amountPaid: z.coerce.number().positive('Enter an amount greater than 0'),
  paymentMethod: z.enum(['jazzcash', 'easypaisa', 'bank', 'cash', 'cheque', 'challan']),
  transactionId: z.string().optional(),
  paymentDate: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

function CollectPaymentDrawer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const [recordPayment, { isLoading }] = useRecordPaymentMutation();
  const open = !!invoice;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
  });

  // Re-seed the form whenever a new invoice is selected
  useEffect(() => {
    if (invoice) {
      reset({
        amountPaid: invoice.balance,
        paymentMethod: 'cash',
        transactionId: '',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [invoice, reset]);

  const onSubmit = async (values: PaymentForm) => {
    if (!invoice) return;
    try {
      await recordPayment({ invoiceId: invoice.id, ...values }).unwrap();
      toast.success('Payment recorded');
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not record payment');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[420px]">
        {invoice && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">Collect Payment</h2>
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="rounded-xl bg-muted p-4">
                <p className="font-medium text-foreground">{invoice.studentName}</p>
                <p className="text-xs text-muted-foreground">{invoice.rollNumber} · {invoice.structureName ?? '—'}</p>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance due</span>
                  <span className="font-semibold text-foreground">{formatCurrency(invoice.balance)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="amountPaid">Amount</Label>
                <Input id="amountPaid" type="number" step="0.01" {...register('amountPaid')} />
                {errors.amountPaid && <p className="mt-1 text-xs text-danger">{errors.amountPaid.message}</p>}
              </div>

              <div>
                <Label>Method</Label>
                <select
                  {...register('paymentMethod')}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <Label htmlFor="transactionId">Transaction / Reference (optional)</Label>
                <Input id="transactionId" {...register('transactionId')} />
              </div>

              <div>
                <Label htmlFor="paymentDate">Date</Label>
                <input
                  id="paymentDate"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  {...register('paymentDate')}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
              <Button type="submit" loading={isLoading}><Wallet size={16} /> Record payment</Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InvoiceDetailDrawer({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const open = !!invoiceId;
  const { data, isFetching } = useGetInvoiceDetailQuery(invoiceId as string, { skip: !invoiceId });
  const [adjust, { isLoading }] = useAdjustInvoiceMutation();
  const d = data?.data;
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const [printing, setPrinting] = useState(false);

  const handlePrintSlip = async () => {
    if (!invoiceId) return;
    setPrinting(true);
    try {
      await openAuthedPdf(`/fees/invoices/${invoiceId}/slip`, accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate slip');
    } finally {
      setPrinting(false);
    }
  };

  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => { setType('credit'); setAmount(''); setReason(''); }, [invoiceId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (!reason.trim()) return toast.error('Enter a reason');
    try {
      await adjust({ invoiceId, type, amount: amt, reason: reason.trim() }).unwrap();
      toast.success(type === 'credit' ? 'Discount applied' : 'Charge applied');
      setAmount(''); setReason('');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Could not apply adjustment');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Invoice details</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {isFetching && !d ? (
              <Skeleton className="h-72 w-full" />
            ) : d ? (
              <>
                <div className="rounded-xl bg-muted p-4">
                  <p className="font-medium text-foreground">{d.studentName}</p>
                  <p className="text-xs text-muted-foreground">{d.rollNumber} · {d.structureName ?? '—'}</p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <Row label="Base amount" value={formatCurrency(d.totalAmount)} />
                  {d.discountAmount > 0 && <Row label="Discounts" value={`− ${formatCurrency(d.discountAmount)}`} />}
                  {d.fineAmount > 0 && <Row label="Charges / fines" value={`+ ${formatCurrency(d.fineAmount)}`} />}
                  <div className="my-1 border-t border-border" />
                  <Row label="Net payable" value={formatCurrency(d.netAmount)} strong />
                  <Row label="Paid" value={formatCurrency(d.paidAmount)} />
                  <Row label="Balance" value={formatCurrency(d.balance)} strong />
                </div>

                {/* Apply adjustment */}
                <form onSubmit={submit} className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Apply discount / charge</p>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setType('credit')}
                      className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${type === 'credit' ? 'border-success bg-success-soft text-success' : 'border-border text-muted-foreground'}`}>
                      <Minus size={14} /> Discount
                    </button>
                    <button type="button" onClick={() => setType('debit')}
                      className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${type === 'debit' ? 'border-danger bg-danger-soft text-danger' : 'border-border text-muted-foreground'}`}>
                      <Plus size={14} /> Charge / fine
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <Input placeholder="Reason (e.g. sibling discount, late fine)" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <Button type="submit" loading={isLoading} className="w-full">Apply</Button>
                  </div>
                </form>

                {/* History */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Receipt size={14} /> Payments</p>
                  {d.payments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No payments yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {d.payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <span className="text-foreground">{formatCurrency(p.amountPaid)} <span className="text-xs text-muted-foreground">· {p.paymentMethod}</span></span>
                          <span className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {d.adjustments.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">Adjustments</p>
                    <ul className="space-y-1.5">
                      {d.adjustments.map((a) => (
                        <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className={a.type === 'credit' ? 'text-success' : 'text-danger'}>
                              {a.type === 'credit' ? '−' : '+'} {formatCurrency(a.amount)}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">{a.reason}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {d && (
              <Button type="button" variant="secondary" loading={printing} onClick={handlePrintSlip}>
                <Printer size={16} /> Print slip
              </Button>
            )}
            <SheetClose asChild><Button type="button" variant="secondary">Close</Button></SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold text-foreground' : 'text-foreground'}>{value}</span>
    </div>
  );
}
