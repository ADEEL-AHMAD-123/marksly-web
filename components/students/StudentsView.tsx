'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus, Download, Filter, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useGetStudentsQuery,
  useBulkImportStudentsMutation,
  type StudentListItem,
} from '@/store/api/studentsApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { getInitials, formatDate, cn } from '@/lib/utils';
import { StudentFormDrawer } from './StudentFormDrawer';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import { useTerminology } from '@/lib/terminology';
import { LoginInfoNote } from '@/components/ui/login-info-note';

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

  // Drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkImport] = useBulkImportStudentsMutation();

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: StudentListItem) => { setDetailId(null); setEditing(s); setFormOpen(true); };

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={
          isLoading ? 'Loading…' : `${total} student${total === 1 ? '' : 's'} total`
        }
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Download size={16} /> Import CSV
            </Button>
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Add Student
            </Button>
          </>
        }
      />

      <LoginInfoNote link={{ href: '/admin/students/roster', label: 'Go to Class Roster' }}>
        <p>Students log in with their Login ID (printed on their ID card, e.g. MKS-XXXXXXXX) plus a PIN set by the school — shown once when the student is added, or any time via <strong>Reset PIN</strong> on the student. Students can change their own PIN later from their account.</p>
        <p>Guardians get a separate parent login — the phone/email entered as guardian for a student, emailed its own temporary password. One guardian phone linked to more than one child means one shared login for all of them.</p>
        <p>Need to look up or reset a student&apos;s Login ID and PIN by class/section in bulk? Use the Class Roster page.</p>
        <p>Missing or bounced guardian email? Open the student, use <strong>Resend parent login</strong> to send a fresh password.</p>
      </LoginInfoNote>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <button
            type="button"
            onClick={() => { setIncompleteOnly((v) => !v); setPage(1); }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              incompleteOnly
                ? 'border-warning bg-warning-soft text-warning'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
            title="Show only students missing address or blood group"
          >
            Missing ID info
          </button>
        </div>
      </Card>

      {/* States */}
      {isError ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load students"
            description="There was a problem reaching the server. Check that the API is running and try again."
            action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
          />
        </Card>
      ) : isLoading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <Card>
          <EmptyState
            icon={Filter}
            title={debouncedQuery || status !== 'all' || incompleteOnly ? 'No students match your filters' : 'No students yet'}
            description={
              debouncedQuery || status !== 'all' || incompleteOnly
                ? 'Try adjusting your search or clearing the filters.'
                : 'Add your first student to get started.'
            }
            action={
              debouncedQuery || status !== 'all' || incompleteOnly ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Add Student</Button>
              )
            }
          />
        </Card>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead>{terminology.classUnit}</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailId(s.id)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
                            {getInitials(s.firstName, s.lastName)}
                          </span>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {students.map((s) => (
              <Card key={s.id} className="cursor-pointer p-4" onClick={() => setDetailId(s.id)}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground">
                    {getInitials(s.firstName, s.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.rollNumber}
                      {s.className ? ` · ${s.className}${s.section ? ` — ${s.section}` : ''}` : ''}
                    </p>
                    <MissingInfoChip missing={missingIdInfo(s)} />
                  </div>
                  <Badge variant={statusBadge[s.status].variant}>
                    {statusBadge[s.status].label}
                  </Badge>
                </div>
                {s.status !== 'active' && s.leftReason && (
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">Left — {s.leftReason}</p>
                )}
                {(s.guardianName || s.guardianPhone) && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">{s.guardianName ?? '—'}</span>
                    <span className="text-foreground">{s.guardianPhone ?? ''}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
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
        </div>
      )}

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
        columns={['firstName', 'lastName', 'rollNumber', 'admissionNumber', 'class', 'section', 'gender', 'guardianPhone', 'guardianName', 'guardianEmail']}
        sample={['Ali', 'Khan', 'STD-2001', 'ADM-2001', 'Grade 5', 'A', 'male', '03009998888', 'Imran Khan', 'imran@example.com']}
        filename="students-template.csv"
        onImport={async (csv) => (await bulkImport({ csv }).unwrap()).data}
        helpText={'Students never have their own email/phone — only guardian contact (guardianPhone + guardianEmail) is collected, and is required for every row. Running more than one active term at once (e.g. overlapping semesters)? Add an optional "term" column with the exact term name if any class name exists in more than one active term — otherwise it can be left out.'}
        resultNote={
          <>
            Logins aren&apos;t emailed or shown per row here — each student got a Login ID and PIN automatically. Find them on the{' '}
            <Link href="/admin/students/roster" className="font-medium text-primary hover:underline">Class Roster</Link> page.
          </>
        }
      />
    </div>
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
    <TableWrapper className="hidden md:block">
      <div className="divide-y divide-border">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
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
    </TableWrapper>
  );
}
