'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft, ChevronRight, AlertCircle, FileText, X, Wallet, Receipt, Plus, Minus, Printer, Ban, ShieldOff, Download, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { openAuthedPdf, openAuthedDownload } from '@/lib/downloadFile';
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
import { getErrorMessage } from '@/lib/get-error-message';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useGetInvoicesQuery,
  useRecordPaymentMutation,
  useVoidPaymentMutation,
  useVoidInvoiceMutation,
  useGetInvoiceDetailQuery,
  useAdjustInvoiceMutation,
  usePreviewBulkSlipsQuery,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from '@/store/api/feesApi';
import type { Section } from '@/store/api/classesApi';

/**
 * `hint` gives every badge a plain-language meaning on hover -- a
 * first-time admin can't reliably tell "overdue" from "pending" from
 * color alone, and "waived" isn't self-explanatory at all.
 */
const statusBadge: Record<InvoiceStatus, { variant: 'warning' | 'primary' | 'success' | 'danger' | 'neutral'; label: string; hint: string }> = {
  pending: { variant: 'warning', label: 'Pending', hint: "Not yet due, or the due date has arrived but no payment is recorded yet" },
  partial: { variant: 'primary', label: 'Partial', hint: "Some payment recorded, but the balance isn't fully paid off yet" },
  paid: { variant: 'success', label: 'Paid', hint: "Fully paid -- nothing more owed on this invoice" },
  overdue: { variant: 'danger', label: 'Overdue', hint: "Past its due date with a balance still remaining" },
  waived: { variant: 'neutral', label: 'Waived', hint: "Forgiven by an admin -- no payment is expected" },
};
// Defensive fallback for a status value this map hasn't been updated for --
// InvoiceStatus is a live enum on the backend model, so a badge lookup must
// never throw just because a new value showed up (see the same guard in
// FeesList.tsx/StudentDashboardFeesNudge.tsx).
const statusBadgeFor = (status: InvoiceStatus) => statusBadge[status] ?? statusBadge.pending;

const AUDIT_ACTION_LABEL: Record<string, string> = {
  payment_recorded: 'Payment recorded',
  payment_voided: 'Payment voided',
  discount_applied: 'Discount applied',
  charge_applied: 'Charge applied',
  invoice_waived: 'Invoice waived',
  adhoc_created: 'Created',
  term_invoice_generated: 'Generated for term',
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

/**
 * `initialStatus`/`initialClassId` let a caller (the Fees page's clickable
 * stat cards — "Outstanding" jumps straight to overdue+pending, "Pending
 * invoices" to pending) land here pre-filtered instead of dumping the user
 * on an unfiltered list they then have to filter themselves. Applied once
 * via useState's lazy initializer, not synced on every prop change — this
 * tab still owns its own filter state after that, same as before.
 */
export function InvoicesTab({ initialStatus, initialClassId }: { initialStatus?: string; initialClassId?: string } = {}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus ?? 'unresolved');
  const [classId, setClassId] = useState(initialClassId ?? 'all');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [collecting, setCollecting] = useState<Invoice | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // A real "print all challans for a month" endpoint (/fees/bulk-slips)
  // already exists server-side but had no UI anywhere -- the only bulk
  // action this list had was Export CSV, even though printing a batch of
  // slips to hand out after generating bills is a genuinely common
  // once-a-month task.
  const [bulkSlipsOpen, setBulkSlipsOpen] = useState(false);
  const debounced = useDebounce(query, 350);
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];

  const statusParam = status === 'all' ? undefined : status === 'unresolved' ? 'pending,partial,overdue' : status;

  const { data, isLoading, isFetching, isError, refetch } = useGetInvoicesQuery({
    page,
    limit: PAGE_SIZE,
    search: debounced || undefined,
    status: statusParam,
    classId: classId === 'all' ? undefined : classId,
  });

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debounced) params.set('search', debounced);
      if (statusParam) params.set('status', statusParam);
      if (classId !== 'all') params.set('classId', classId);
      const meta = await openAuthedDownload(`/fees/invoices/export.csv?${params.toString()}`, accessToken, `invoices-${new Date().toISOString().slice(0, 10)}.csv`);
      if (meta.truncated) {
        toast.error(`Exported the first ${meta.returnedCount?.toLocaleString('en-PK')} of ${meta.totalCount?.toLocaleString('en-PK')} matching invoices -- narrow your filters (status/class/search) for a complete export.`, { duration: 6000 });
      } else if (meta.returnedCount !== undefined) {
        toast.success(`Exported ${meta.returnedCount.toLocaleString('en-PK')} invoice${meta.returnedCount === 1 ? '' : 's'}${status !== 'all' ? ` (${status === 'unresolved' ? 'unresolved' : status})` : ''}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not export invoices');
    } finally {
      setExporting(false);
    }
  };

  const [exportingPayments, setExportingPayments] = useState(false);
  const handleExportPayments = async () => {
    setExportingPayments(true);
    try {
      const params = new URLSearchParams();
      if (debounced) params.set('search', debounced);
      if (classId !== 'all') params.set('classId', classId);
      const meta = await openAuthedDownload(`/fees/payments/export.csv?${params.toString()}`, accessToken, `payments-${new Date().toISOString().slice(0, 10)}.csv`);
      if (meta.truncated) {
        toast.error(`Exported the first ${meta.returnedCount?.toLocaleString('en-PK')} of ${meta.totalCount?.toLocaleString('en-PK')} matching payments -- narrow by class/search for a complete export.`, { duration: 6000 });
      } else if (meta.returnedCount !== undefined) {
        toast.success(`Exported ${meta.returnedCount.toLocaleString('en-PK')} payment${meta.returnedCount === 1 ? '' : 's'}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not export payments');
    } finally {
      setExportingPayments(false);
    }
  };

  const invoices = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Toolbar — purely instrumental (find/filter invoices), kept visually
          lighter than the cards below it, same convention as Classes/Subjects/
          ID Cards/Timetable. */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Filters: scope which invoices are showing. */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={query}
              onChange={(v) => { setQuery(v); setPage(1); }}
              placeholder="Search student, roll no., challan or receipt number…"
              className="flex-1"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unresolved">Unresolved (default)</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Export is an action on the results, not a filter -- separated
              with a divider so it doesn't read as a fourth filter control. */}
          <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-border sm:pl-3">
            <Button variant="ghost" onClick={() => setBulkSlipsOpen(true)} className="w-full sm:w-auto" title="Print every unpaid challan for a month in one PDF">
              <Printer size={16} /> Print all slips
            </Button>
            <Button variant="ghost" onClick={handleExportCsv} loading={exporting} className="w-full sm:w-auto" title="Export the current filtered invoice list as CSV">
              <FileDown size={16} /> Export CSV
            </Button>
            <Button variant="ghost" onClick={handleExportPayments} loading={exportingPayments} className="w-full sm:w-auto" title="Export a payment-by-payment record (date, method, receipt #) for reconciling against a bank/gateway statement">
              <Download size={16} /> Export payments
            </Button>
          </div>
        </div>
      </div>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title="Couldn't load invoices" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : invoices.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No invoices to show" description="Invoices appear here once a fee structure generates them, or you create a one-off invoice above -- there is nothing missing or broken." /></Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          {/* Desktop */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className={inv.status === 'overdue' ? 'bg-danger-soft/30' : undefined}>
                      <TableCell>
                        <p className="font-medium text-foreground">{inv.studentName}</p>
                        <p className="text-xs text-muted-foreground">{inv.rollNumber}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inv.className ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.structureName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-foreground">
                        {formatCurrency(inv.netAmount)}
                        {/* Only worth a second number once balance actually
                            diverges from the full amount (partially paid,
                            or adjusted) -- otherwise it's the same figure
                            printed twice. */}
                        {inv.balance !== inv.netAmount && (
                          <span className="ml-1.5 text-xs text-muted-foreground">({formatCurrency(inv.balance)} due)</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={statusBadgeFor(inv.status).variant} title={statusBadgeFor(inv.status).hint}>{statusBadgeFor(inv.status).label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetailId(inv.id)}>Details</Button>
                          {inv.status !== 'paid' && (
                            <Button size="sm" variant="primary" onClick={() => setCollecting(inv)}>Collect</Button>
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
              <Card key={inv.id} className={inv.status === 'overdue' ? 'border-danger/40 bg-danger-soft/20 p-4' : 'p-4'}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{inv.studentName}</p>
                    <p className="text-xs text-muted-foreground">{inv.rollNumber} · {inv.className ?? '—'} · {inv.structureName ?? '—'}</p>
                  </div>
                  <Badge variant={statusBadgeFor(inv.status).variant} title={statusBadgeFor(inv.status).hint}>{statusBadgeFor(inv.status).label}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Balance {formatCurrency(inv.balance)}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(inv.id)}>Details</Button>
                    {inv.status !== 'paid' && (
                      <Button size="sm" variant="primary" onClick={() => setCollecting(inv)}>Collect</Button>
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
      <BulkSlipsDialog open={bulkSlipsOpen} onClose={() => setBulkSlipsOpen(false)} classes={classes} />
    </div>
  );
}

const MONTH_LABEL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Prints every unresolved challan for a chosen month (optionally scoped to
 *  one class/section) into a single PDF -- the batch-printing counterpart
 *  to "Generate this month's bills", for handing out physical challans
 *  after they're created. Defaults to the current month/year since that's
 *  the case an admin lands here for almost every time. Shows a live
 *  preview (count + total, and how many already-paid invoices are being
 *  skipped) before generating, so a wrong month/class pick gets caught
 *  before a PDF full of the wrong challans gets built. */
function BulkSlipsDialog({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: { id: string; name: string; sections?: Section[] }[] }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [classId, setClassId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [includePaid, setIncludePaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  // Reset the section pick whenever the class changes -- a section id from
  // the previously selected class means nothing once a different class (or
  // "All classes") is chosen.
  useEffect(() => { setSectionId('all'); }, [classId]);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass?.sections ?? [];

  const { data: previewRes, isFetching: previewLoading } = usePreviewBulkSlipsQuery(
    {
      month: Number(month),
      year: Number(year),
      classId: classId === 'all' ? undefined : classId,
      sectionId: sectionId === 'all' ? undefined : sectionId,
      includePaid,
    },
    { skip: !open }
  );
  const preview = previewRes?.data;

  const submit = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, year });
      if (classId !== 'all') params.set('classId', classId);
      if (sectionId !== 'all') params.set('sectionId', sectionId);
      if (includePaid) params.set('includePaid', 'true');
      await openAuthedPdf(`/fees/bulk-slips?${params.toString()}`, accessToken);
      toast.success(`Generated ${preview?.count ?? ''} slip${preview?.count === 1 ? '' : 's'} for ${MONTH_LABEL[Number(month) - 1]} ${year}`.trim());
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate the slips');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[420px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Print all slips</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Generates one PDF with every unpaid challan due for the month below -- handy for printing a batch to hand out right after generating bills.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bulk-slips-month">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="bulk-slips-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_LABEL.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bulk-slips-year">Year</Label>
                <Input id="bulk-slips-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bulk-slips-class">Class (optional)</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger id="bulk-slips-class"><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Only worth showing once a class with actual sections is
                  picked -- most classes/institutions have none, and an
                  always-visible disabled dropdown would just be clutter. */}
              {sections.length > 0 && (
                <div>
                  <Label htmlFor="bulk-slips-section">Section</Label>
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger id="bulk-slips-section"><SelectValue placeholder="All sections" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {classId === 'all' && (
              <p className="-mt-2 text-xs text-muted-foreground">Leave as "All classes" to include the whole institution.</p>
            )}

            <label className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
              <input
                type="checkbox"
                checked={includePaid}
                onChange={(e) => setIncludePaid(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm">
                <span className="block font-medium text-foreground">Include already-paid invoices</span>
                <span className="block text-xs text-muted-foreground">Off by default -- printing a challan for a settled invoice looks like a new bill to whoever receives it.</span>
              </span>
            </label>

            {/* Live preview -- catches a wrong month/class pick (0 results,
                or a suspiciously large/small count) before committing to
                generating a PDF, the same way the billing-run preview does
                for "Generate this month's bills". */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              {previewLoading ? (
                <p className="text-muted-foreground">Checking…</p>
              ) : !preview ? (
                <p className="text-muted-foreground">Couldn't load a preview -- generating will still show you exactly what happened.</p>
              ) : preview.count === 0 ? (
                <p className="text-warning">
                  {preview.excludedPaidCount > 0
                    ? `All ${preview.excludedPaidCount} invoice(s) for this selection are already paid. Turn on "include already-paid" above to print them anyway.`
                    : "No bills found for this month/class yet -- generate this month's bills first."}
                </p>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    {preview.count} slip{preview.count === 1 ? '' : 's'} -- {formatCurrency(preview.totalAmount)} total
                  </p>
                  {preview.excludedPaidCount > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{preview.excludedPaidCount} already-paid invoice(s) excluded.</p>
                  )}
                  {preview.exceedsLimit && (
                    <p className="mt-1 text-xs text-danger">
                      That's over the {preview.limit}-slip limit for one PDF -- narrow by class/section to generate.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" loading={loading} disabled={!preview || preview.count === 0 || preview.exceedsLimit} onClick={submit}>
              <Printer size={16} /> Generate PDF
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const paymentSchema = z.object({
  amountPaid: z.coerce.number().positive('Enter an amount greater than 0'),
  paymentMethod: z.enum(['jazzcash', 'easypaisa', 'bank', 'cash', 'cheque', 'challan']),
  transactionId: z.string().optional(),
  // Distinct from the invoice's own stable challanNumber (printed on the
  // slip) -- this is the bank/challan slip's OWN reference number staff
  // reconcile a deposit against, only meaningful for bank/challan methods.
  challanNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  allowOverpaymentCredit: z.boolean().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

function CollectPaymentDrawer({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const [recordPayment, { isLoading }] = useRecordPaymentMutation();
  const open = !!invoice;

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
  });
  const paymentMethod = watch('paymentMethod');
  const showChallanField = paymentMethod === 'challan' || paymentMethod === 'bank';

  // Re-seed the form whenever a new invoice is selected
  useEffect(() => {
    if (invoice) {
      reset({
        amountPaid: invoice.balance,
        paymentMethod: 'cash',
        transactionId: '',
        challanNumber: '',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [invoice, reset]);

  const amountPaid = watch('amountPaid');
  const overpaymentAmount = invoice && amountPaid ? Math.max(0, Number(amountPaid) - invoice.balance) : 0;

  const onSubmit = async (values: PaymentForm) => {
    if (!invoice) return;
    try {
      const res = await recordPayment({ invoiceId: invoice.id, ...values }).unwrap();
      if ((res as any)?.data?.creditBanked > 0) {
        toast.success(`Payment recorded — ${formatCurrency((res as any).data.creditBanked)} banked as credit toward the next invoice`);
      } else {
        toast.success('Payment recorded');
      }
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

              {overpaymentAmount > 0 && (
                <label className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4">
                  <input type="checkbox" {...register('allowOverpaymentCredit')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      This is {formatCurrency(overpaymentAmount)} more than the balance due
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Record the full amount received and bank the extra as credit toward this student's next invoice — never refunded automatically. Leave unchecked to reject this as an error instead.
                    </span>
                  </span>
                </label>
              )}

              <div>
                <Label htmlFor="paymentMethod">Method</Label>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="transactionId">Reference number (optional)</Label>
                <Input id="transactionId" placeholder="Only for your own records -- not shown to the parent or student" {...register('transactionId')} />
              </div>

              {showChallanField && (
                <div>
                  <Label htmlFor="challanNumber">Bank slip number (optional)</Label>
                  <Input id="challanNumber" placeholder="The number printed on the physical deposit slip, if you want to match it later" {...register('challanNumber')} />
                </div>
              )}

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
  const [voidPayment, { isLoading: voidingPayment }] = useVoidPaymentMutation();
  const [voidInvoice, { isLoading: voidingInvoice }] = useVoidInvoiceMutation();
  const d = data?.data;
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  // Voiding/waiving is admin-only server-side (fee.routes.ts's canVoid) --
  // an accountant can still record payments/adjustments here, just not
  // correct them after the fact.
  const isAdmin = useSelector((s: RootState) => s.auth.user?.role) === 'admin';
  const [printing, setPrinting] = useState(false);
  const [voidPaymentTarget, setVoidPaymentTarget] = useState<{ id: string; amount: number } | null>(null);
  const [voidPaymentReason, setVoidPaymentReason] = useState('');
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');

  const confirmVoidPayment = async () => {
    if (!voidPaymentTarget || !invoiceId || !voidPaymentReason.trim()) return;
    try {
      await voidPayment({ invoiceId, paymentId: voidPaymentTarget.id, reason: voidPaymentReason.trim() }).unwrap();
      toast.success('Payment voided');
      setVoidPaymentTarget(null);
      setVoidPaymentReason('');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not void this payment'));
    }
  };

  const confirmWaiveInvoice = async () => {
    if (!invoiceId || !waiveReason.trim()) return;
    try {
      await voidInvoice({ invoiceId, reason: waiveReason.trim() }).unwrap();
      toast.success('Invoice waived');
      setWaiveOpen(false);
      setWaiveReason('');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not waive this invoice'));
    }
  };

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

  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloadingReceiptId(paymentId);
    try {
      await openAuthedPdf(`/fees/payments/${paymentId}/receipt`, accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate the receipt');
    } finally {
      setDownloadingReceiptId(null);
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
                        <li key={p.id} className={`rounded-lg border px-3 py-2 text-sm ${p.voided ? 'border-border/60 bg-muted/30' : 'border-border'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={p.voided ? 'text-muted-foreground line-through' : 'text-foreground'}>
                              {formatCurrency(p.amountPaid)} <span className="text-xs text-muted-foreground no-underline">· {p.paymentMethod}</span>
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</span>
                              {p.voided ? (
                                <Badge variant="neutral">Voided</Badge>
                              ) : (
                                <button
                                  type="button"
                                  title="Download official receipt"
                                  disabled={downloadingReceiptId === p.id}
                                  onClick={() => handleDownloadReceipt(p.id)}
                                  className="rounded-md p-1 text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground disabled:opacity-50"
                                >
                                  <Download size={13} />
                                </button>
                              )}
                              {!p.voided && isAdmin && (
                                <button
                                  type="button"
                                  title="Void this payment — for a wrongly-recorded amount"
                                  onClick={() => setVoidPaymentTarget({ id: p.id, amount: p.amountPaid })}
                                  className="rounded-md p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                                >
                                  <Ban size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          {p.voided && p.voidReason && (
                            <p className="mt-1 text-xs text-muted-foreground">Voided: {p.voidReason}</p>
                          )}
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

                {d.auditLog.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">History</p>
                    <ul className="space-y-1.5">
                      {d.auditLog.map((e, i) => (
                        <li key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                          <span className="min-w-0 text-foreground">
                            {AUDIT_ACTION_LABEL[e.action] ?? e.action}
                            {e.note && <span className="ml-2 text-muted-foreground">{e.note}</span>}
                          </span>
                          <span className="shrink-0 text-muted-foreground">{formatDate(e.at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
            <div>
              {/* Waiving only makes sense while nothing has been collected
                  yet -- voidPayment first otherwise, same rule the backend
                  enforces (INVOICE_HAS_PAYMENTS). */}
              {isAdmin && d && d.status !== 'waived' && d.paidAmount === 0 && (
                <Button type="button" variant="ghost" onClick={() => setWaiveOpen(true)}>
                  <ShieldOff size={16} /> Waive invoice
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {d && (
                <Button type="button" variant="secondary" loading={printing} onClick={handlePrintSlip}>
                  <Printer size={16} /> Print slip
                </Button>
              )}
              <SheetClose asChild><Button type="button" variant="secondary">Close</Button></SheetClose>
            </div>
          </div>
        </div>
      </SheetContent>

      {voidPaymentTarget && (
        <ConfirmDialog
          open
          onClose={() => { setVoidPaymentTarget(null); setVoidPaymentReason(''); }}
          onConfirm={confirmVoidPayment}
          title="Void this payment?"
          description={
            <>
              This removes <strong>{formatCurrency(voidPaymentTarget.amount)}</strong> from the invoice&apos;s paid
              total — it stays in the history marked voided, but the invoice balance updates immediately.
              <div className="mt-3">
                <Label htmlFor="void-payment-reason">Reason</Label>
                <Input
                  id="void-payment-reason"
                  value={voidPaymentReason}
                  onChange={(e) => setVoidPaymentReason(e.target.value)}
                  placeholder="e.g. Entered wrong amount"
                />
              </div>
            </>
          }
          confirmLabel="Void payment"
          tone="warning"
          loading={voidingPayment}
          icon={Ban}
        />
      )}

      {waiveOpen && (
        <ConfirmDialog
          open
          onClose={() => { setWaiveOpen(false); setWaiveReason(''); }}
          onConfirm={confirmWaiveInvoice}
          title="Waive this invoice?"
          description={
            <>
              Marks the invoice as waived — it will no longer show as due anywhere. Only possible because nothing
              has been paid against it yet.
              <div className="mt-3">
                <Label htmlFor="waive-reason">Reason</Label>
                <Input
                  id="waive-reason"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="e.g. Wrong student billed"
                />
              </div>
            </>
          }
          confirmLabel="Waive invoice"
          tone="warning"
          loading={voidingInvoice}
          icon={ShieldOff}
        />
      )}
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
