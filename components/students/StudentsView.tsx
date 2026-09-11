'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Upload, Filter, ChevronLeft, ChevronRight,
  AlertCircle, Eye, EyeOff, Users2, Mail, MailWarning, UserX, X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useGetStudentsQuery,
  useGetGuardianEmailStatsQuery,
  useBulkImportStudentsMutation,
  useLazyGetStudentPinQuery,
  type StudentListItem,
} from '@/store/api/studentsApi';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { Avatar } from '@/components/ui/avatar';
import { getInitials, formatDate, cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import { StudentFormDrawer } from './StudentFormDrawer';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import { ClassRosterView } from './ClassRosterView';
import { useTerminology } from '@/lib/terminology';
import { InfoNote } from '@/components/ui/info-note';
import { isInsideRadixPopper, POINTER_EVENTS_OVERRIDE } from '@/components/ui/sheet';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

/** Small badge summarizing whether a guardian can actually be reached by
 *  email — folded in from the old Email Delivery Status page so this is
 *  visible right in the row instead of on a separate page. */
const guardianEmailMeta: Record<
  NonNullable<StudentListItem['guardianEmailStatus']>,
  { icon: typeof Mail; label: string; className: string; title: string }
> = {
  ok: { icon: Mail, label: 'Email OK', className: 'text-success', title: 'Guardian welcome email was delivered fine' },
  problem: { icon: MailWarning, label: 'Email delivery failed', className: 'text-danger', title: 'Guardian’s latest welcome email failed or bounced' },
  no_email: { icon: MailWarning, label: 'No email', className: 'text-warning', title: 'Guardian has no email on file — nothing was ever sent' },
  no_guardian: { icon: UserX, label: 'No guardian', className: 'text-muted-foreground', title: 'No guardian linked to this student' },
};

const statusBadge: Record<
  StudentListItem['status'],
  { variant: 'success' | 'neutral' | 'warning' | 'outline' | 'danger'; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'neutral', label: 'Inactive' },
  graduated: { variant: 'outline', label: 'Graduated' },
  expelled: { variant: 'danger', label: 'Expelled' },
  transferred: { variant: 'warning', label: 'Transferred' },
  withdrawn: { variant: 'neutral', label: 'Withdrawn' },
};

const PAGE_SIZE = 20;

export function StudentsView() {
  const terminology = useTerminology();
  const [query, setQuery] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') ?? ''
  );
  const [status, setStatus] = useState<string>('all');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  // Not exposed as its own filter dropdown — set only by clicking the
  // needs-attention banner below, as a shortcut into the relevant subset
  // rather than a manual option someone has to know to pick.
  const [guardianEmailStatus, setGuardianEmailStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 350);
  const filtersActive =
    !!debouncedQuery || status !== 'all' || !!classId || guardianEmailStatus !== 'all';

  const { data: classesRes } = useGetClassesQuery();
  const classes: ClassOption[] = classesRes?.data ?? [];
  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];

  // Needs-attention counts — folded in from the old Email Delivery Status
  // page, so an admin sees "3 guardians never got their login" right here
  // instead of hunting a separate page for it.
  const { data: guardianStatsRes } = useGetGuardianEmailStatsQuery();
  const guardianStats = guardianStatsRes?.data;

  // Drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Set when the drawer should open scrolled straight to Guardian login —
  // e.g. clicking the "Email delivery failed" badge — instead of at the top.
  const [detailFocus, setDetailFocus] = useState<'guardianLogin' | null>(null);
  const openGuardianLoginDetail = (id: string) => { setDetailId(id); setDetailFocus('guardianLogin'); };
  const [importOpen, setImportOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [bulkImport] = useBulkImportStudentsMutation();

  // Inline PIN reveal in the Login column — mirrors ClassRosterView's
  // reveal/hide pattern, one PIN fetched (and cached in state) at a time per
  // row rather than eagerly for the whole page.
  const [fetchPin] = useLazyGetStudentPinQuery();
  const [revealedPins, setRevealedPins] = useState<Record<string, string | null>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const togglePinReveal = async (s: StudentListItem) => {
    if (revealedPins[s.id] !== undefined) {
      setRevealedPins((m) => { const next = { ...m }; delete next[s.id]; return next; });
      return;
    }
    setRevealingId(s.id);
    try {
      const res = await fetchPin(s.id).unwrap();
      setRevealedPins((m) => ({ ...m, [s.id]: res.data.pin }));
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reveal PIN'));
    } finally {
      setRevealingId(null);
    }
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: StudentListItem) => { setDetailId(null); setEditing(s); setFormOpen(true); };

  const { data, isLoading, isFetching, isError, refetch } = useGetStudentsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedQuery || undefined,
    status: status === 'all' ? undefined : (status as StudentListItem['status']),
    classId: classId || undefined,
    sectionId: sectionId || undefined,
    guardianEmailStatus: guardianEmailStatus === 'all' ? undefined : (guardianEmailStatus as 'problem' | 'no_email'),
  });

  const students = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setClassId('');
    setSectionId('');
    setGuardianEmailStatus('all');
    setPage(1);
  };

  const showResults = !isError && !isLoading && students.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={
          isLoading ? 'Loading…' : `${total} student${total === 1 ? '' : 's'} total`
        }
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {/* Secondary actions — relabeled to say what they actually do
                rather than naming a feature/file-format ("Class logins" and
                "Bulk import" didn't explain themselves to a first-time
                admin). Grouped and evenly split so they don't wrap
                unpredictably on narrow screens; demoted below Add Student
                since they're used a handful of times per admission cycle,
                not per visit. */}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setRosterOpen(true)}>
                <Users2 size={16} /> View/export logins
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setImportOpen(true)}>
                <Upload size={16} /> Import from CSV
              </Button>
            </div>
            {/* Full-width on mobile and listed last in source order but
                visually primary — the one action most admins want most
                often, so it shouldn't have to compete for wrap space with
                the two secondary buttons above on a narrow screen. */}
            <Button variant="primary" size="sm" className="w-full sm:w-auto" onClick={openAdd}>
              <Plus size={16} /> Add Student
            </Button>
          </div>
        }
      />

      {/* One merged panel: toolbar (search/filter) directly attached to the
          list it controls, then pagination — a single visual unit instead
          of a separate filter card floating above a separately-bordered
          table. Reference/help content lives below, past the primary task
          (see the InfoNotes block near the bottom of this file). */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Needs-attention banner — folded in from the old Email Delivery
            Status page, so guardians who never got (or lost) their login
            aren't only discoverable by visiting a separate page. Clicking
            jumps straight to the filtered view. */}
        {!!guardianStats && (guardianStats.problem > 0 || guardianStats.noEmail > 0) && (
          <button
            type="button"
            onClick={() => { setGuardianEmailStatus(guardianStats.problem > 0 ? 'problem' : 'no_email'); setPage(1); }}
            className="flex w-full items-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2.5 text-left text-sm text-warning hover:brightness-95"
          >
            <MailWarning size={15} className="shrink-0" />
            <span>
              {guardianStats.problem > 0 && (
                <>
                  <strong>{guardianStats.problem}</strong> guardian{guardianStats.problem === 1 ? '' : 's'} had a failed/bounced login email
                </>
              )}
              {guardianStats.problem > 0 && guardianStats.noEmail > 0 && ' · '}
              {guardianStats.noEmail > 0 && (
                <>
                  <strong>{guardianStats.noEmail}</strong> guardian{guardianStats.noEmail === 1 ? '' : 's'} with no email on file
                </>
              )}
            </span>
          </button>
        )}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-[200px] flex-1">
            <SearchInput
              value={query}
              onChange={(v) => { setQuery(v); setPage(1); }}
              placeholder="Search by student, guardian name/phone, roll or admission no…"
            />
          </div>
          <Select value={classId || 'all'} onValueChange={(v) => { setClassId(v === 'all' ? '' : v); setSectionId(''); setPage(1); }}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder={terminology.classUnit} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {terminology.classUnit}</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={sectionId || 'all'}
            onValueChange={(v) => { setSectionId(v === 'all' ? '' : v); setPage(1); }}
            disabled={!classId}
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>

        {/* States */}
        {isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load students"
            description="There was a problem reaching the server. Check that the API is running and try again."
            action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
          />
        ) : isLoading ? (
          <LoadingState />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={filtersActive ? 'No students match your filters' : 'No students yet'}
            description={
              filtersActive
                ? 'Try adjusting your search or clearing the filters.'
                : 'Add your first student to get started.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Add Student</Button>
              )
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead>{terminology.classUnit}</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => { setDetailId(s.id); setDetailFocus(null); }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            size="sm"
                            photoUrl={s.profilePhoto}
                            alt={s.name}
                            initials={getInitials(s.firstName, s.lastName)}
                          />
                          <div>
                            <p className="font-medium text-foreground">{s.name}</p>
                            {/* "Roll:" label added — a bare number under a
                                name otherwise reads as ambiguous to anyone
                                who hasn't memorized this layout yet. Bumped
                                to text-foreground/80 so it's not the
                                lowest-contrast text on the page. */}
                            <p className="text-xs text-foreground/70">
                              Roll: <span className="font-medium">{s.rollNumber}</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground/80">
                        {s.className ? `${s.className}${s.section ? ` — ${s.section}` : ''}` : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <LoginCell
                          student={s}
                          pin={revealedPins[s.id]}
                          revealing={revealingId === s.id}
                          onToggle={togglePinReveal}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground">{s.guardianName ?? '—'}</p>
                        {s.guardianPhone && (
                          <p className="text-xs text-foreground/70">{s.guardianPhone}</p>
                        )}
                        {s.guardianEmail && (
                          <p className="text-xs text-foreground/70">{s.guardianEmail}</p>
                        )}
                        <GuardianEmailBadge status={s.guardianEmailStatus} onOpenDetail={() => openGuardianLoginDetail(s.id)} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadge[s.status].variant}
                          title={s.status !== 'active' && (s.leftAt || s.leftReason)
                            ? `Left${s.leftAt ? ` ${formatDate(s.leftAt)}` : ''}${s.leftReason ? ` — ${s.leftReason}` : ''}`
                            : undefined}
                        >
                          {statusBadge[s.status].label}
                        </Badge>
                        {s.status !== 'active' && s.leftReason && (
                          <p className="mt-1 max-w-[160px] truncate text-xs text-foreground/70" title={s.leftReason}>
                            {s.leftReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight size={16} className="ml-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile rows — divided list rows (matching the desktop table's
                rhythm) instead of individually-boxed cards, so the panel
                doesn't nest a border-within-a-border on small screens. */}
            <div className="divide-y divide-border md:hidden">
              {students.map((s) => (
                <div
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 p-4 active:bg-muted/40"
                  onClick={() => { setDetailId(s.id); setDetailFocus(null); }}
                >
                  <Avatar
                    size="md"
                    photoUrl={s.profilePhoto}
                    alt={s.name}
                    initials={getInitials(s.firstName, s.lastName)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-foreground/70">
                      Roll: <span className="font-medium">{s.rollNumber}</span>
                      {s.className ? ` · ${s.className}${s.section ? ` — ${s.section}` : ''}` : ''}
                    </p>
                    {s.status !== 'active' && s.leftReason && (
                      <p className="mt-1 truncate text-xs text-foreground/70">Left — {s.leftReason}</p>
                    )}
                    {(s.guardianName || s.guardianPhone || s.guardianEmail) && (
                      <p className="mt-1 truncate text-xs text-foreground/70">
                        Guardian: {s.guardianName ?? '—'}{s.guardianPhone ? ` · ${s.guardianPhone}` : ''}{s.guardianEmail ? ` · ${s.guardianEmail}` : ''}
                      </p>
                    )}
                    {s.systemId && (
                      <p className="mt-1 truncate font-mono text-[11px] text-foreground/60">Login: {s.systemId}</p>
                    )}
                    <GuardianEmailBadge status={s.guardianEmailStatus} onOpenDetail={() => openGuardianLoginDetail(s.id)} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge variant={statusBadge[s.status].variant}>
                      {statusBadge[s.status].label}
                    </Badge>
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination — total count shown right here too, not only in the
            page header far above, since that's long scrolled out of view
            by the time someone's paging through results. */}
        {showResults && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
              <span className="ml-1.5">· {total} student{total === 1 ? '' : 's'}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Help / reference — split into focused, independently-collapsible
          questions rather than one long note, and placed below the primary
          task (search/list) rather than above it: this is material an
          admin consults occasionally, not on every visit, so it shouldn't
          outrank the thing they came here to do. */}
      <div className="space-y-2">
        <InfoNote title="How do students log in?">
          <p>With a Login ID (e.g. MKS-XXXXXXXX) and a PIN — both generated automatically by the system the moment a student is added, no setup needed. Both are shown once right after adding the student, and printed on their ID card. Students can change their own PIN later from their account.</p>
        </InfoNote>
        <InfoNote title="How do guardians log in?">
          <p>Guardians get a separate parent login — the phone/email entered as guardian for a student is automatically emailed its own temporary password. One guardian phone linked to more than one child means one shared login for all of them.</p>
        </InfoNote>
        <InfoNote title="Lost a Login ID or PIN, or need to look one up later?">
          <p>Every student&apos;s Login ID and PIN is shown right here in the table — click the eye icon to reveal a PIN, or open a student to reset it from their details. For bulk lookup or CSV export by class/section, use the <strong>View/export logins</strong> button above.</p>
        </InfoNote>
        <InfoNote title="Guardian email missing or bounced?">
          <p>Open the student and use <strong>Resend login</strong> or <strong>Set password</strong> under Guardian login. It&apos;ll warn you first if that guardian has already signed in, since resending overwrites their current password.</p>
        </InfoNote>
      </div>

      {/* Class logins — bulk Login ID/PIN lookup + CSV export by class and
          section, folded in from the old standalone Student Logins page.
          Reuses ClassRosterView's own picker/table/reset-PIN logic wholesale
          (embedded mode just hides its page header) rather than duplicating
          it here. */}
      <DialogPrimitive.Root open={rosterOpen} onOpenChange={setRosterOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none',
              POINTER_EVENTS_OVERRIDE
            )}
            onPointerDownOutside={(e) => { if (isInsideRadixPopper(e.target)) e.preventDefault(); }}
            onInteractOutside={(e) => { if (isInsideRadixPopper(e.target)) e.preventDefault(); }}
          >
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="text-base font-semibold">View/export logins</DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              Look up or reset every student&apos;s Login ID and PIN by class and section, or export the whole section as CSV.
            </DialogPrimitive.Description>
            <div className="mt-4">
              {rosterOpen && <ClassRosterView mode="admin" embedded />}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Add / Edit drawer */}
      <StudentFormDrawer
        open={formOpen}
        student={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />

      {/* Detail drawer */}
      <StudentDetailDrawer
        studentId={detailId}
        open={!!detailId}
        focus={detailFocus}
        onClose={() => { setDetailId(null); setDetailFocus(null); }}
        onEdit={openEdit}
      />

      {/* Bulk import */}
      <ImportCsvDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Students"
        columns={['firstName', 'lastName', 'rollNumber', 'admissionNumber', 'class', 'section', 'gender', 'guardianPhone', 'guardianName', 'guardianEmail', 'nationalIdNumber']}
        sample={['Ali', 'Khan', 'STD-2001', 'ADM-2001', 'Grade 5', 'A', 'male', '03009998888', 'Imran Khan', 'imran@example.com', '42101-1234567-1']}
        filename="students-template.csv"
        onImport={async (csv) => (await bulkImport({ csv }).unwrap()).data}
        helpText={'Students never have their own email/phone — only guardian contact (guardianPhone + guardianEmail) is collected, and is required for every row. "nationalIdNumber" (Form B/CNIC, format 42101-1234567-1) is optional. Running more than one active term at once (e.g. overlapping semesters)? Add an optional "term" column with the exact term name if any class name exists in more than one active term — otherwise it can be left out.'}
        resultNote={
          <>
            Logins aren&apos;t emailed or shown per row here — each student got a Login ID and PIN automatically. Find them in the table above, or use the <strong>View/export logins</strong> button for bulk lookup/export.
          </>
        }
      />

    </div>
  );
}

/** Login ID + masked/revealed PIN, inline in the table — replaces the old
 *  separate Student Logins page for the common "look up one PIN" case
 *  (bulk roster/export still lives behind the "Class logins" popup). Same
 *  reveal/hide interaction as ClassRosterView's RosterRow. */
function LoginCell({
  student, pin, revealing, onToggle,
}: {
  student: StudentListItem;
  pin: string | null | undefined;
  revealing: boolean;
  onToggle: (s: StudentListItem) => void;
}) {
  if (!student.systemId) {
    return <span className="text-xs text-muted-foreground">Not generated yet</span>;
  }
  const revealed = pin !== undefined;
  return (
    <div>
      <p className="font-mono text-xs text-foreground/80">{student.systemId}</p>
      <div className="mt-0.5 flex items-center gap-1">
        {revealed ? (
          pin ? (
            <span className="font-mono text-xs font-medium text-foreground">{pin}</span>
          ) : (
            <span className="text-xs text-muted-foreground" title="This student changed their own PIN, so it can no longer be viewed — only reset.">
              Student-set
            </span>
          )
        ) : (
          <span className="font-mono text-xs text-muted-foreground">••••</span>
        )}
        {student.pinState === 'school_issued' && (
          <button
            type="button"
            disabled={revealing}
            onClick={() => onToggle(student)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label={revealed ? 'Hide PIN' : 'Reveal PIN'}
            title={revealed ? 'Hide PIN' : 'Reveal PIN'}
          >
            {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Guardian email deliverability, folded in from the old Email Delivery
 *  Status page — see guardianEmailMeta above. Hidden for 'ok' to keep rows
 *  calm; only surfaces when there's something worth noticing. */
function GuardianEmailBadge({ status, onOpenDetail }: { status?: StudentListItem['guardianEmailStatus']; onOpenDetail?: () => void }) {
  if (!status || status === 'ok' || status === 'no_guardian') return null;
  const meta = guardianEmailMeta[status];
  const Icon = meta.icon;
  // Clickable straight into the Guardian login section of the detail
  // drawer — this badge is exactly the kind of thing an admin clicks
  // expecting to see more, not just a static label.
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpenDetail?.(); }}
      className={cn(
        'mt-0.5 flex items-center gap-1 text-[11px] font-medium underline-offset-2 hover:underline',
        meta.className
      )}
      title={`${meta.title} — click for details`}
    >
      <Icon size={11} className="shrink-0" /> {meta.label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
