'use client';

import { useState } from 'react';
import { X, Pencil, UserMinus, AlertCircle, Wallet, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import {
  useGetStudentQuery,
  useDeleteStudentMutation,
  type StudentListItem,
} from '@/store/api/studentsApi';
import { useGetFeeCardQuery } from '@/store/api/feesApi';
import { getInitials, formatCurrency, formatDate } from '@/lib/utils';
import { openAuthedPdf } from '@/lib/downloadFile';
import type { RootState } from '@/store';

interface Props {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (s: StudentListItem) => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

const END_ENROLLMENT_REASONS: { value: 'transferred' | 'withdrawn' | 'expelled' | 'inactive'; label: string }[] = [
  { value: 'transferred', label: 'Transferred to another school' },
  { value: 'withdrawn', label: 'Withdrawn (did not seek readmission)' },
  { value: 'expelled', label: 'Expelled' },
  { value: 'inactive', label: 'Other' },
];

export function StudentDetailDrawer({ studentId, open, onClose, onEdit }: Props) {
  const { data, isLoading } = useGetStudentQuery(studentId as string, { skip: !studentId });
  const [deleteStudent, { isLoading: deleting }] = useDeleteStudentMutation();
  const [confirming, setConfirming] = useState(false);
  const [endStatus, setEndStatus] = useState<'transferred' | 'withdrawn' | 'expelled' | 'inactive'>('transferred');
  const [endReason, setEndReason] = useState('');
  const { data: cardData, isFetching: cardLoading } = useGetFeeCardQuery(
    { studentId: studentId as string },
    { skip: !studentId }
  );
  const accessToken = useSelector((st: RootState) => st.auth.accessToken);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);

  const s = data?.data as any;
  const card = cardData?.data;

  const handlePrintSlip = async (invoiceId: string) => {
    setPrintingInvoiceId(invoiceId);
    try {
      await openAuthedPdf(`/fees/invoices/${invoiceId}/slip`, accessToken);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate slip');
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const handleEndEnrollment = async () => {
    if (!studentId) return;
    try {
      await deleteStudent({ id: studentId, status: endStatus, reason: endReason.trim() || undefined }).unwrap();
      toast.success('Student enrollment ended');
      setConfirming(false);
      setEndReason('');
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not end enrollment');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setConfirming(false); onClose(); } }}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Student details</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={18} />
            </SheetClose>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {isLoading || !s ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary-soft-foreground">
                    {getInitials(s.firstName, s.lastName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.rollNumber}</p>
                  </div>
                  <Badge
                    variant={s.status === 'active' ? 'success' : 'neutral'}
                    className="ml-auto capitalize"
                  >
                    {s.status}
                  </Badge>
                </div>

                <div className="mt-5 divide-y divide-border rounded-xl border border-border px-4">
                  <Row label="Class" value={s.className ? `${s.className}${s.section ? ` — ${s.section}` : ''}` : null} />
                  <Row label="Admission no." value={s.admissionNumber} />
                  <Row label="Phone" value={s.phone} />
                  <Row label="Email" value={s.email} />
                  <Row label="Gender" value={s.gender} />
                  <Row label="Blood group" value={s.bloodGroup} />
                  <Row label="City" value={s.city} />
                  {s.status !== 'active' && s.leftAt && (
                    <Row label="Left on" value={formatDate(s.leftAt)} />
                  )}
                  {s.status !== 'active' && s.leftReason && (
                    <Row label="Reason" value={s.leftReason} />
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wallet size={12} /> Fee card
                  </p>
                  {cardLoading && !card ? (
                    <Skeleton className="h-24 w-full" />
                  ) : !card || card.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No fee invoices yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Billed {formatCurrency(card.totals.billed)}</span>
                        <span className="text-muted-foreground">Paid {formatCurrency(card.totals.paid)}</span>
                        <span className="font-semibold text-foreground">Due {formatCurrency(card.totals.balance)}</span>
                      </div>
                      <div className="max-h-56 space-y-1.5 overflow-y-auto">
                        {card.rows.map((r) => (
                          <div key={r.invoiceId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate text-foreground">{r.structureName ?? '—'} · {formatDate(r.dueDate)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(r.paidAmount)} / {formatCurrency(r.netAmount)}
                                <Badge
                                  variant={r.status === 'paid' ? 'success' : r.status === 'overdue' ? 'danger' : 'warning'}
                                  className="ml-2 capitalize"
                                >
                                  {r.status}
                                </Badge>
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={printingInvoiceId === r.invoiceId}
                              onClick={() => handlePrintSlip(r.invoiceId)}
                            >
                              <Printer size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {s.guardians?.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Guardians
                    </p>
                    <div className="space-y-2">
                      {s.guardians.map((g: any) => (
                        <div key={g.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <span className="text-foreground">{g.name}</span>
                          <span className="text-muted-foreground">{g.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {s && (
            <div className="border-t border-border px-5 py-4">
              {confirming ? (
                <div className="space-y-2.5 rounded-lg bg-danger-soft px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-danger" />
                    <span className="text-sm font-medium text-danger">End this student's enrollment</span>
                  </div>
                  <select
                    value={endStatus}
                    onChange={(e) => setEndStatus(e.target.value as typeof endStatus)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                  >
                    {END_ENROLLMENT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={endReason}
                    onChange={(e) => setEndReason(e.target.value)}
                    placeholder="Note (optional) — e.g. school name, details"
                    maxLength={500}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setEndReason(''); }}>Cancel</Button>
                    <Button variant="danger" size="sm" loading={deleting} onClick={handleEndEnrollment}>
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setConfirming(true)}
                    disabled={s.status !== 'active'}
                  >
                    <UserMinus size={16} /> End enrollment
                  </Button>
                  <Button size="sm" onClick={() => onEdit(s)}>
                    <Pencil size={16} /> Edit
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
