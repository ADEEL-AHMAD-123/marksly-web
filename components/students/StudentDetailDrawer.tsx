'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Pencil, UserMinus, UserCheck, AlertCircle, Wallet, Printer, GraduationCap, ChevronDown,
  KeyRound, Eye, EyeOff, Send, Mail, MailWarning, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useGetStudentQuery,
  useDeleteStudentMutation,
  useUpdateStudentMutation,
  useGetStudentCgpaQuery,
  useGetStudentTermGpaQuery,
  useGetStudentContactStatusQuery,
  useLazyGetStudentPinQuery,
  useLazyGetGuardianPinQuery,
  useResendStudentCredentialsMutation,
  useResetStudentPinMutation,
  useResetGuardianPinMutation,
  type StudentListItem,
} from '@/store/api/studentsApi';
import { useGetFeeCardQuery } from '@/store/api/feesApi';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useTerminology } from '@/lib/terminology';
import { getInitials, formatCurrency, formatDate, cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { openAuthedPdf } from '@/lib/downloadFile';
import { getErrorMessage } from '@/lib/get-error-message';
import { friendlyEmailError } from '@/lib/friendly-email-error';
import type { RootState } from '@/store';

interface Props {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (s: StudentListItem) => void;
  /** When 'guardianLogin', the drawer scrolls straight to the Guardian
   *  login section once its content has loaded — used when opened from the
   *  Students table's "Email delivery failed"/"No email" badge, so the
   *  admin lands right on the detail instead of having to scroll and hunt
   *  for it themselves. */
  focus?: 'guardianLogin' | null;
}

/** Renders a list of names with each one bolded, joined naturally ("Ali",
 *  "Ali and Sara", "Ali, Sara and Bilal") — used wherever a child's or
 *  guardian's name appears inline in confirm-dialog copy. */
function boldNameList(names: string[]) {
  return names.map((name, i) => (
    <span key={i}>
      {i > 0 && (i === names.length - 1 ? ' and ' : ', ')}
      <strong>{name}</strong>
    </span>
  ));
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm text-right ${value ? 'font-medium text-foreground' : 'italic text-muted-foreground'}`}>
        {value || 'Not set'}
      </span>
    </div>
  );
}

/** Plain-language label for the guardian welcome email's delivery status —
 *  see email-log.model.ts's EmailStatus for what each value actually means
 *  (e.g. 'sent' is just "our API call succeeded", not a delivery guarantee). */
const EMAIL_LOG_STATUS_LABEL: Record<'sent' | 'failed' | 'delivered' | 'bounced' | 'delayed', string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Delivery failed',
  bounced: 'Bounced back',
  delayed: 'Delayed — still trying',
};

const END_ENROLLMENT_REASONS: { value: 'transferred' | 'withdrawn' | 'expelled' | 'inactive'; label: string }[] = [
  { value: 'transferred', label: 'Transferred to another school' },
  { value: 'withdrawn', label: 'Withdrawn (did not seek readmission)' },
  { value: 'expelled', label: 'Expelled' },
  { value: 'inactive', label: 'Other' },
];

export function StudentDetailDrawer({ studentId, open, onClose, onEdit, focus }: Props) {
  const { data, isLoading } = useGetStudentQuery(studentId as string, { skip: !studentId });
  const [deleteStudent, { isLoading: deleting }] = useDeleteStudentMutation();
  const [updateStudent, { isLoading: reactivating }] = useUpdateStudentMutation();
  const [confirming, setConfirming] = useState(false);
  const [endStatus, setEndStatus] = useState<'transferred' | 'withdrawn' | 'expelled' | 'inactive'>('transferred');
  const [endReason, setEndReason] = useState('');
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivateClassId, setReactivateClassId] = useState('');
  const [reactivateSectionId, setReactivateSectionId] = useState('');
  const { data: classesData } = useGetClassesQuery({ all: true }, { skip: !showReactivate });
  const classes = classesData?.data ?? [];
  const reactivateSections = classes.find((c) => c.id === reactivateClassId)?.sections ?? [];
  const { data: cardData, isFetching: cardLoading } = useGetFeeCardQuery(
    { studentId: studentId as string },
    { skip: !studentId }
  );
  const accessToken = useSelector((st: RootState) => st.auth.accessToken);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const { data: cgpaData, isFetching: cgpaLoading } = useGetStudentCgpaQuery(studentId as string, { skip: !studentId });
  const terminology = useTerminology();
  // Accordion: only one term's course-level breakdown is fetched/shown at a
  // time — lazily, only once that row is expanded (not all terms up front).
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const { data: termGpaData, isFetching: termGpaLoading } = useGetStudentTermGpaQuery(
    { studentId: studentId as string, termId: expandedTermId as string },
    { skip: !studentId || !expandedTermId }
  );
  const termGpa = termGpaData?.data;

  // Login + Guardian login sections — see getContactStatus() in
  // student.service.ts. Same informed-confirm pattern as the row quick
  // actions on StudentsView.tsx (fetch context first, then confirm),
  // reused here so a "resend"/"reset"/"set password" from the drawer
  // behaves identically to one from the table row.
  const { data: contactStatusData } = useGetStudentContactStatusQuery(studentId as string, { skip: !studentId || !open });
  const contactStatus = contactStatusData?.data;

  const [fetchPin] = useLazyGetStudentPinQuery();
  const [revealedPin, setRevealedPin] = useState<string | null | undefined>(undefined);
  const [revealingPin, setRevealingPin] = useState(false);
  const togglePinReveal = async () => {
    if (!studentId) return;
    if (revealedPin !== undefined) { setRevealedPin(undefined); return; }
    setRevealingPin(true);
    try {
      const res = await fetchPin(studentId).unwrap();
      setRevealedPin(res.data.pin);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reveal PIN'));
    } finally {
      setRevealingPin(false);
    }
  };

  // Same reveal-on-demand pattern, for the guardian's PIN — same login
  // mechanism as the student's own, see resetGuardianPin()/getGuardianPin().
  const [fetchGuardianPin] = useLazyGetGuardianPinQuery();
  const [revealedGuardianPin, setRevealedGuardianPin] = useState<string | null | undefined>(undefined);
  const [revealingGuardianPin, setRevealingGuardianPin] = useState(false);
  const toggleGuardianPinReveal = async () => {
    if (!studentId) return;
    if (revealedGuardianPin !== undefined) { setRevealedGuardianPin(undefined); return; }
    setRevealingGuardianPin(true);
    try {
      const res = await fetchGuardianPin({ id: studentId }).unwrap();
      setRevealedGuardianPin(res.data.pin);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reveal PIN'));
    } finally {
      setRevealingGuardianPin(false);
    }
  };

  const [resendCredentials, { isLoading: resending }] = useResendStudentCredentialsMutation();
  const [resetPin, { isLoading: resettingPin }] = useResetStudentPinMutation();
  const [resetGuardianPin, { isLoading: resettingGuardianPin }] = useResetGuardianPinMutation();
  type CredentialAction = 'resend' | 'pin' | 'guardianPin';
  const [pendingCredAction, setPendingCredAction] = useState<CredentialAction | null>(null);
  const [credReveal, setCredReveal] = useState<{ name: string; systemId?: string; pin?: string; roleLabel?: string } | null>(null);
  // Editable in the resend confirm dialog — lets the admin fix a typo'd or
  // bounced address in the same step as resending, instead of a separate
  // edit-then-resend trip. Purely a convenience now (email no longer gates
  // or verifies guardian login), so there's no domain-check/confirm step
  // here anymore — a typo'd domain just means the email itself won't
  // arrive, which the delivery-status block below already surfaces.
  const [resendEmail, setResendEmail] = useState('');

  const openResendConfirm = () => {
    setResendEmail(contactStatus?.guardian?.email ?? '');
    setPendingCredAction('resend');
  };
  const openResetPinConfirm = () => setPendingCredAction('pin');
  const openResetGuardianPinConfirm = () => setPendingCredAction('guardianPin');

  const runCredAction = async () => {
    if (!studentId || !pendingCredAction || !s) return;
    try {
      if (pendingCredAction === 'resend') {
        const res = await resendCredentials({
          id: studentId,
          target: 'parent',
          email: resendEmail.trim() || undefined,
          guardianUserId: contactStatus?.guardian?.id,
        }).unwrap();
        toast.success(`Sent to ${res.data.sentTo}`);
      } else if (pendingCredAction === 'pin') {
        const res = await resetPin({ id: studentId }).unwrap();
        setCredReveal({ name: s.name, systemId: s.systemId ?? '—', pin: res.data.pin });
        setRevealedPin(undefined);
      } else {
        const res = await resetGuardianPin({ id: studentId, guardianUserId: contactStatus?.guardian?.id }).unwrap();
        setCredReveal({ name: res.data.guardianName, pin: res.data.pin, roleLabel: 'Parent' });
        setRevealedGuardianPin(undefined);
        if (res.data.siblingCount > 0) {
          toast(`Also updates login for ${res.data.siblingCount} other linked ${res.data.siblingCount === 1 ? 'child' : 'children'}`, { icon: 'ℹ️' });
        }
      }
      setPendingCredAction(null);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not complete this action'));
    }
  };

  const s = data?.data as any;

  // Scroll straight to the Guardian login section once its content has
  // actually loaded (contactStatus, not just the student — the section's
  // content depends on it) — see the `focus` prop's own comment above.
  const guardianLoginRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && focus === 'guardianLogin' && s && contactStatus) {
      guardianLoginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [open, focus, s, contactStatus]);

  const card = cardData?.data;
  const cgpa = cgpaData?.data;
  // The backend returns cgpa: null with an empty termBreakdown when the
  // student has no gpa-scheme results at all (e.g. every class they've
  // taken uses percentage_letter/cambridge/pass_fail instead) — not an
  // error, just "not applicable". Don't show a confusing "CGPA: null".
  const hasGpaData = !!cgpa && cgpa.cgpa != null && cgpa.termBreakdown.length > 0;

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

  const handleReactivate = async () => {
    if (!studentId || !reactivateClassId || !reactivateSectionId) return;
    try {
      await updateStudent({ id: studentId, body: { status: 'active', classId: reactivateClassId, sectionId: reactivateSectionId } }).unwrap();
      toast.success('Student reactivated');
      setShowReactivate(false);
      setReactivateClassId('');
      setReactivateSectionId('');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reactivate student'));
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
            <div className="flex items-center gap-1.5">
              {/* Duplicated in the footer too — surfaced here as well since
                  admins reported not noticing the footer button without
                  being told it was there. */}
              {s && (
                <Button size="sm" onClick={() => onEdit(s)}>
                  <Pencil size={16} /> Edit
                </Button>
              )}
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={18} />
              </SheetClose>
            </div>
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
                  <Avatar
                    size="lg"
                    className="h-14 w-14 text-base"
                    photoUrl={s.profilePhoto}
                    alt={s.name}
                    initials={getInitials(s.firstName, s.lastName)}
                  />
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
                  {/* Students never have their own email/phone — only a
                      guardian's contact info exists (shown in the Guardians
                      section below). Showing "Phone"/"Email" rows here would
                      always be blank and could be misread as the student's
                      own contact info if ever populated by mistake. */}
                  <Row label="Gender" value={s.gender} />
                  <Row label="Blood group" value={s.bloodGroup} />
                  <Row label="Address" value={s.address} />
                  <Row label="City" value={s.city} />
                  {s.status !== 'active' && s.leftAt && (
                    <Row label="Left on" value={formatDate(s.leftAt)} />
                  )}
                  {s.status !== 'active' && s.leftReason && (
                    <Row label="Reason" value={s.leftReason} />
                  )}
                </div>

                {/* Login — Login ID + PIN, reveal/reset right here instead
                    of routing to a separate page. See getContactStatus()
                    for pinState (whether the current PIN can even be
                    viewed vs. only reset). */}
                <div className="mt-5">
                  <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <KeyRound size={12} /> Student login
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">The student can sign in using this Login ID and PIN.</p>
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="font-mono text-sm text-foreground">{s.systemId ?? 'Not generated yet'}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {contactStatus?.pinState === 'student_set' ? (
                          <span className="text-xs text-muted-foreground" title="This student changed their own PIN — only viewable by resetting it.">
                            Student-set PIN (not viewable)
                          </span>
                        ) : revealedPin !== undefined ? (
                          <span className="font-mono text-sm font-medium text-foreground">{revealedPin}</span>
                        ) : (
                          <span className="font-mono text-sm text-muted-foreground">••••</span>
                        )}
                        {s.systemId && contactStatus?.pinState !== 'student_set' && (
                          <button
                            type="button"
                            disabled={revealingPin}
                            onClick={togglePinReveal}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label={revealedPin !== undefined ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {revealedPin !== undefined ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={openResetPinConfirm}>
                      <KeyRound size={14} /> Reset
                    </Button>
                  </div>
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

                {cgpaLoading && !cgpaData ? (
                  <div className="mt-5">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : hasGpaData ? (
                  <div className="mt-5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <GraduationCap size={12} /> CGPA
                    </p>
                    <div className="rounded-xl border border-border px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cumulative</span>
                        <span className="text-2xl font-bold text-foreground">{cgpa!.cgpa!.toFixed(2)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{cgpa!.totalCreditHours} credit hours total</p>
                      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {cgpa!.termBreakdown.map((t) => {
                          const isExpanded = expandedTermId === t.termId;
                          return (
                            <div key={t.termId}>
                              <button
                                type="button"
                                onClick={() => setExpandedTermId(isExpanded ? null : t.termId)}
                                className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-left text-sm hover:bg-muted"
                              >
                                <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                                  <ChevronDown
                                    size={13}
                                    className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                  <span className="truncate">{t.termName || terminology.term}</span>
                                </span>
                                <span className="shrink-0 whitespace-nowrap font-medium text-foreground">
                                  {t.gpa != null ? t.gpa.toFixed(2) : '—'}
                                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                    ({t.creditHours} cr.)
                                  </span>
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="ml-4 mt-1 mb-1 space-y-1 border-l border-border pl-3">
                                  {termGpaLoading && !termGpa ? (
                                    <Skeleton className="h-12 w-full" />
                                  ) : termGpa ? (
                                    <>
                                      {termGpa.courses.length === 0 ? (
                                        <p className="py-1 text-xs text-muted-foreground">No gpa-scheme courses for this term.</p>
                                      ) : (
                                        termGpa.courses.map((c) => (
                                          <div key={c.resultId} className="flex items-center justify-between gap-2 py-1 text-xs">
                                            <span className="min-w-0 truncate text-muted-foreground">{c.subjectName}</span>
                                            <span className="shrink-0 whitespace-nowrap font-medium text-foreground">
                                              {c.gradePoints.toFixed(2)}
                                              <span className="ml-1 font-normal text-muted-foreground">({c.creditHours} cr.)</span>
                                            </span>
                                          </div>
                                        ))
                                      )}
                                      {termGpa.excludedPendingCount > 0 && (
                                        <p className="pt-1 text-xs text-warning">
                                          {termGpa.excludedPendingCount} result{termGpa.excludedPendingCount === 1 ? '' : 's'} pending an official grade, excluded from this GPA.
                                        </p>
                                      )}
                                    </>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

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

                {/* Guardian login — folded in from the old Email Delivery
                    Status page: status of the guardian's welcome email,
                    plus the two recovery actions (resend, or hand over a
                    password directly). Both go through the informed-confirm
                    dialog below rather than firing blind. */}
                <div ref={guardianLoginRef} className="mt-5 scroll-mt-4">
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Guardian login
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    The parent can sign in using either their phone number or email, along with this PIN.
                  </p>
                  {!contactStatus?.guardian ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                      <UserX size={14} /> No guardian account on file.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{contactStatus.guardian.name}</p>
                        {contactStatus.guardian.email ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Mail size={11} /> {contactStatus.guardian.email}
                          </span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-warning">
                            <MailWarning size={11} /> No email on file
                          </span>
                        )}
                      </div>
                      {contactStatus.guardian.phone && (
                        <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">{contactStatus.guardian.phone}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contactStatus.guardian.hasLoggedIn ? 'Has signed in before.' : 'Has not signed in yet.'}
                      </p>

                      {/* PIN — same reveal-on-demand pattern as the
                          student's own Login section above, since it's now
                          the exact same login mechanism (phone/email + PIN
                          instead of a real password). */}
                      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">PIN</span>
                          {contactStatus.guardian.pinState === 'guardian_set' ? (
                            <span className="text-xs text-muted-foreground" title="This guardian changed their own PIN — only viewable by resetting it.">
                              (self-set, not viewable)
                            </span>
                          ) : revealedGuardianPin !== undefined ? (
                            <span className="font-mono text-sm font-medium text-foreground">{revealedGuardianPin}</span>
                          ) : (
                            <span className="font-mono text-sm text-muted-foreground">••••</span>
                          )}
                          {contactStatus.guardian.pinState !== 'guardian_set' && (
                            <button
                              type="button"
                              disabled={revealingGuardianPin}
                              onClick={toggleGuardianPinReveal}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                              aria-label={revealedGuardianPin !== undefined ? 'Hide PIN' : 'Reveal PIN'}
                            >
                              {revealedGuardianPin !== undefined ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}
                        </div>
                        <Button variant="secondary" size="sm" onClick={openResetGuardianPinConfirm}>
                          <KeyRound size={13} /> Reset
                        </Button>
                      </div>

                      {/* Delivery status of the most recent login-details
                          email — informational only now (doesn't gate or
                          verify login, see the PIN redesign), but still the
                          "why" behind the "Email delivery failed" badge on
                          the Students table row: exactly when it was
                          sent/attempted, to which address, and (when it
                          failed) the actual error so the admin isn't left
                          guessing before deciding to resend. */}
                      {contactStatus.guardian.emailLog && (
                        <div
                          className={cn(
                            'mt-2.5 rounded-lg px-3 py-2 text-xs',
                            contactStatus.guardian.emailLog.status === 'failed' || contactStatus.guardian.emailLog.status === 'bounced'
                              ? 'bg-danger-soft text-danger'
                              : contactStatus.guardian.emailLog.status === 'delayed'
                                ? 'bg-warning-soft text-warning'
                                : 'bg-muted/60 text-muted-foreground'
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            {contactStatus.guardian.emailLog.status === 'failed' || contactStatus.guardian.emailLog.status === 'bounced' ? (
                              <MailWarning size={12} className="shrink-0" />
                            ) : (
                              <Mail size={12} className="shrink-0" />
                            )}
                            {EMAIL_LOG_STATUS_LABEL[contactStatus.guardian.emailLog.status]}
                            {contactStatus.guardian.emailLog.isResend && <span className="font-normal opacity-80">(resend)</span>}
                          </div>
                          <p className="mt-1 opacity-90">
                            To {contactStatus.guardian.emailLog.to} · {formatDate(contactStatus.guardian.emailLog.sentAt)}
                          </p>
                          {contactStatus.guardian.emailLog.error && (
                            // Plain-language explanation as the primary text
                            // — the raw provider error (meant for a
                            // developer, not an admin) is still available on
                            // hover for anyone who needs it for real
                            // troubleshooting. See lib/friendly-email-error.ts.
                            <p className="mt-1" title={contactStatus.guardian.emailLog.error}>
                              {friendlyEmailError(contactStatus.guardian.emailLog.error)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={openResendConfirm}>
                          <Send size={13} /> Email login details
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
                  {!!card?.totals?.balance && (
                    <p className="text-xs text-warning">
                      This student owes {formatCurrency(card.totals.balance)} — it carries forward, this action does not clear it.
                    </p>
                  )}
                  <Select value={endStatus} onValueChange={(v) => setEndStatus(v as typeof endStatus)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {END_ENROLLMENT_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              ) : showReactivate ? (
                <div className="space-y-2.5 rounded-lg bg-success-soft px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="shrink-0 text-success" />
                    <span className="text-sm font-medium text-foreground">Reactivate — assign a current class</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={reactivateClassId || undefined}
                      onValueChange={(v) => { setReactivateClassId(v); setReactivateSectionId(''); }}
                    >
                      <SelectTrigger><SelectValue placeholder={terminology.classUnit} /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.termName ?? '—'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={reactivateSectionId || undefined}
                      onValueChange={setReactivateSectionId}
                      disabled={!reactivateClassId}
                    >
                      <SelectTrigger><SelectValue placeholder={terminology.section} /></SelectTrigger>
                      <SelectContent>
                        {reactivateSections.map((sec) => <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowReactivate(false)}>Cancel</Button>
                    <Button size="sm" loading={reactivating} disabled={!reactivateClassId || !reactivateSectionId} onClick={handleReactivate}>
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  {s.status === 'active' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => setConfirming(true)}
                    >
                      <UserMinus size={16} /> End enrollment
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-success hover:bg-success-soft"
                      onClick={() => setShowReactivate(true)}
                    >
                      <UserCheck size={16} /> Reactivate
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Resend / reset-PIN confirm — same informed-confirm pattern as
          StudentsView.tsx's row quick actions. */}
      <ConfirmDialog
        open={!!pendingCredAction}
        onClose={() => setPendingCredAction(null)}
        onConfirm={() => runCredAction()}
        loading={pendingCredAction === 'resend' ? resending : pendingCredAction === 'pin' ? resettingPin : resettingGuardianPin}
        tone={
          (pendingCredAction === 'pin' && contactStatus?.pinState === 'student_set') ||
          (pendingCredAction === 'guardianPin' && contactStatus?.guardian?.pinState === 'guardian_set')
            ? 'warning'
            : 'default'
        }
        title={
          pendingCredAction === 'resend' ? 'Email the login details?'
          : pendingCredAction === 'pin' ? "Reset this student's PIN?"
          : "Reset this guardian's PIN?"
        }
        description={
          pendingCredAction === 'resend' ? (
            <div className="space-y-3">
              <p>
                This emails <strong>{contactStatus?.guardian?.name}</strong> their login details: their phone or email
                (whichever they sign in with) plus their current PIN — along with the Login ID and PIN for{' '}
                {boldNameList([s?.name, ...(contactStatus?.guardian?.otherChildrenNames ?? [])].filter(Boolean))}, so
                everything is in the one email. It&apos;s just a convenience copy for them to keep — nothing about
                actually logging in depends on this email arriving or being opened.
              </p>
              <div>
                <Label htmlFor="resend-guardian-email">Send to this email</Label>
                <Input
                  id="resend-guardian-email"
                  type="email"
                  dir="ltr"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="guardian@example.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">Fix a typo or bounced address here before sending — it'll be saved as their new email too.</p>
              </div>
            </div>
          ) : pendingCredAction === 'pin' ? (
            contactStatus?.pinState === 'student_set' ? (
              <>
                <strong>{s?.name}</strong> already changed their own PIN, so the current one can&apos;t be shown —
                resetting replaces it with a new one immediately, and you&apos;ll need to hand it to them or their
                guardian yourself. You can view it again anytime from the Login section above, or the Login IDs &amp;
                PINs page.
              </>
            ) : (
              <>
                This replaces <strong>{s?.name}</strong>&apos;s current PIN with a new one immediately. You can view
                it anytime afterward from the Login section above, or the Login IDs &amp; PINs page.
              </>
            )
          ) : contactStatus?.guardian?.pinState === 'guardian_set' ? (
            <>
              <strong>{contactStatus?.guardian?.name}</strong> already changed their own PIN, so the current one
              can&apos;t be shown — resetting replaces it with a new one immediately.
              {(contactStatus?.guardian?.otherChildrenNames?.length ?? 0) > 0 && (
                <> This login is shared with {boldNameList(contactStatus!.guardian!.otherChildrenNames)} too, so it changes their access as well, not just <strong>{s?.name}</strong>&apos;s.</>
              )}
            </>
          ) : (
            <>
              This replaces <strong>{contactStatus?.guardian?.name}</strong>&apos;s current PIN with a new one
              immediately. You can view it again anytime from the Guardian login section above, or the Login IDs
              &amp; PINs page.
              {(contactStatus?.guardian?.otherChildrenNames?.length ?? 0) > 0 && (
                <> This login is shared with {boldNameList(contactStatus!.guardian!.otherChildrenNames)} too, so it changes their access as well, not just <strong>{s?.name}</strong>&apos;s.</>
              )}
            </>
          )
        }
        confirmLabel={
          pendingCredAction === 'resend' ? 'Send email'
          : 'Reset PIN'
        }
      />

      {/* One-time reveal — reused for a fresh student or guardian PIN reset,
          same contract as StudentsView.tsx's pinReveal. */}
      <TempPasswordDialog
        open={!!credReveal}
        onClose={() => setCredReveal(null)}
        name={credReveal?.name ?? ''}
        systemId={credReveal?.systemId}
        pin={credReveal?.pin}
        roleLabel={credReveal?.roleLabel}
      />
    </Sheet>
  );
}
