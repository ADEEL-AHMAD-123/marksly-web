'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Plus, Download, Filter, ChevronLeft, ChevronRight,
  AlertCircle, MoreVertical, Send, KeyRound, Square, SquareCheck, X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { SearchInput } from '@/components/ui/search-input';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useGetStudentsQuery,
  useBulkImportStudentsMutation,
  useResendStudentCredentialsMutation,
  useResetStudentPinMutation,
  type StudentListItem,
} from '@/store/api/studentsApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { Avatar } from '@/components/ui/avatar';
import { getInitials, formatDate, cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import { StudentFormDrawer } from './StudentFormDrawer';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import { useTerminology } from '@/lib/terminology';
import { InfoNote } from '@/components/ui/info-note';

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
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 350);
  const filtersActive = !!debouncedQuery || status !== 'all' || incompleteOnly;

  // Drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkImport] = useBulkImportStudentsMutation();

  // Row quick-actions — resend parent login / reset PIN, without opening the
  // full detail drawer. Kept deliberately narrow (no "End enrollment" here):
  // that's a destructive lifecycle change and stays behind the detail
  // drawer's explicit reason-and-confirm step on purpose, so a fast row menu
  // can't be used to accidentally end an enrollment in one misclick.
  const [resendCredentials, { isLoading: resending }] = useResendStudentCredentialsMutation();
  const [resetPin, { isLoading: resettingPin }] = useResetStudentPinMutation();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [pinReveal, setPinReveal] = useState<{ name: string; systemId: string; pin: string } | null>(null);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: StudentListItem) => { setDetailId(null); setEditing(s); setFormOpen(true); };

  const handleResendParentLogin = async (s: StudentListItem) => {
    setActioningId(s.id);
    try {
      const res = await resendCredentials({ id: s.id, target: 'parent' }).unwrap();
      toast.success(`Sent to ${res.data.sentTo}`);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not resend parent login'));
    } finally {
      setActioningId(null);
    }
  };

  const handleResetPin = async (s: StudentListItem) => {
    setActioningId(s.id);
    try {
      const res = await resetPin({ id: s.id }).unwrap();
      setPinReveal({ name: s.name, systemId: s.systemId ?? '—', pin: res.data.pin });
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reset PIN'));
    } finally {
      setActioningId(null);
    }
  };

  const { data, isLoading, isFetching, isError, refetch } = useGetStudentsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedQuery || undefined,
    status: status === 'all' ? undefined : (status as StudentListItem['status']),
    incomplete: incompleteOnly || undefined,
  });

  const students = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setIncompleteOnly(false);
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
          <>
            {/* Demoted below Add Student — used a handful of times per
                admission cycle, not per visit, so it shouldn't compete
                visually with the action almost every visit is here for. */}
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
              <Download size={16} /> Import CSV
            </Button>
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Add Student
            </Button>
          </>
        }
      />

      {/* One merged panel: toolbar (search/filter) directly attached to the
          list it controls, then pagination — a single visual unit instead
          of a separate filter card floating above a separately-bordered
          table. Reference/help content lives below, past the primary task
          (see the InfoNotes block near the bottom of this file). */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Search by name, roll or admission number…"
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-44">
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
          {/* Restyled onto the shared Button visual vocabulary (radius,
              border, hover) instead of a bespoke one-off style, with a
              checkbox-style icon so the ON/OFF state doesn't rely on color
              alone (recognition over recall). */}
          <button
            type="button"
            onClick={() => { setIncompleteOnly((v) => !v); setPage(1); }}
            className={cn(
              buttonVariants({ variant: incompleteOnly ? 'soft' : 'secondary', size: 'sm' }),
              'shrink-0'
            )}
            title="Show only students missing address or blood group"
          >
            {incompleteOnly ? <SquareCheck size={14} /> : <Square size={14} />} Missing ID info
          </button>
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
                    <TableHead>Guardian</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailId(s.id)}>
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
                            <p className="text-xs text-muted-foreground">{s.rollNumber}</p>
                            <MissingInfoChip missing={missingIdInfo(s)} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.className ? `${s.className}${s.section ? ` — ${s.section}` : ''}` : '—'}
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground">{s.guardianName ?? '—'}</p>
                        {s.guardianPhone && (
                          <p className="text-xs text-muted-foreground">{s.guardianPhone}</p>
                        )}
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
                          <p className="mt-1 max-w-[160px] truncate text-xs text-muted-foreground" title={s.leftReason}>
                            {s.leftReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <StudentQuickActions
                            student={s}
                            busy={actioningId === s.id && (resending || resettingPin)}
                            onResendParentLogin={handleResendParentLogin}
                            onResetPin={handleResetPin}
                          />
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </div>
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
                  onClick={() => setDetailId(s.id)}
                >
                  <Avatar
                    size="md"
                    photoUrl={s.profilePhoto}
                    alt={s.name}
                    initials={getInitials(s.firstName, s.lastName)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.rollNumber}
                      {s.className ? ` · ${s.className}${s.section ? ` — ${s.section}` : ''}` : ''}
                    </p>
                    <MissingInfoChip missing={missingIdInfo(s)} />
                    {s.status !== 'active' && s.leftReason && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">Left — {s.leftReason}</p>
                    )}
                    {(s.guardianName || s.guardianPhone) && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {s.guardianName ?? '—'}{s.guardianPhone ? ` · ${s.guardianPhone}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge variant={statusBadge[s.status].variant}>
                      {statusBadge[s.status].label}
                    </Badge>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <StudentQuickActions
                        student={s}
                        busy={actioningId === s.id && (resending || resettingPin)}
                        onResendParentLogin={handleResendParentLogin}
                        onResetPin={handleResetPin}
                      />
                    </div>
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
        <InfoNote title="Lost a Login ID or PIN, or need to look one up later?" link={{ href: '/admin/students/roster', label: 'Go to Student Logins' }}>
          <p>Every student&apos;s Login ID and PIN can be viewed, edited, or reset — one at a time or in bulk by class/section — from the <strong>Student Logins</strong> page. Or use <strong>Reset PIN</strong> right from a student&apos;s row here.</p>
        </InfoNote>
        <InfoNote title="Guardian email missing or bounced?">
          <p>Use <strong>Resend parent login</strong> from a student&apos;s row here, or open the student for more detail.</p>
        </InfoNote>
      </div>

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
        onClose={() => setDetailId(null)}
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
            Logins aren&apos;t emailed or shown per row here — each student got a Login ID and PIN automatically. Find them on the{' '}
            <Link href="/admin/students/roster" className="font-medium text-primary hover:underline">Student Logins</Link> page.
          </>
        }
      />

      {/* Reset-PIN reveal — reuses the same one-time-reveal dialog pattern
          as the creation flow, since a fresh reset genuinely mints a new
          PIN the admin needs to hand to the guardian/student right now. */}
      <TempPasswordDialog
        open={!!pinReveal}
        onClose={() => setPinReveal(null)}
        name={pinReveal?.name ?? ''}
        systemId={pinReveal?.systemId}
        pin={pinReveal?.pin}
      />
    </div>
  );
}

/** Row-level quick actions — the two highest-frequency, lowest-risk tasks
 *  (login help) pulled out of the full detail drawer so they're one click
 *  instead of open-drawer-scroll-past-profile-click. Deliberately does NOT
 *  include "End enrollment": that's a destructive status change and stays
 *  gated behind the detail drawer's explicit reason/confirm step so a fast
 *  row menu can't turn it into a one-misclick mistake. */
function StudentQuickActions({
  student, busy, onResendParentLogin, onResetPin,
}: {
  student: StudentListItem;
  busy: boolean;
  onResendParentLogin: (s: StudentListItem) => void;
  onResetPin: (s: StudentListItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          aria-label={`More actions for ${student.name}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!student.guardianName}
          onClick={() => onResendParentLogin(student)}
        >
          <Send size={14} /> Resend parent login
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResetPin(student)}>
          <KeyRound size={14} /> Reset PIN
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Fields the ID card contact-info feature needs, per student — surfaced
 *  right in the row so an admin browsing the list already sees who needs
 *  attention, instead of only finding out via the "Missing ID info" filter
 *  or by opening each record one at a time. */
function missingIdInfo(s: StudentListItem): string[] {
  const missing: string[] = [];
  if (!s.address) missing.push('Address');
  if (!s.bloodGroup) missing.push('Blood group');
  if (!s.guardianName) missing.push('Guardian');
  if (!s.profilePhoto) missing.push('Photo');
  return missing;
}

function MissingInfoChip({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  return (
    <p
      className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-warning"
      title={`Missing: ${missing.join(', ')}`}
    >
      <AlertCircle size={11} className="shrink-0" />
      <span className="truncate">Missing {missing.join(', ')}</span>
    </p>
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
