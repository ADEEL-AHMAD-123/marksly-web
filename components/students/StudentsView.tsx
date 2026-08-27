'use client';

import { useState } from 'react';
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
import { getInitials } from '@/lib/utils';
import { StudentFormDrawer } from './StudentFormDrawer';
import { StudentDetailDrawer } from './StudentDetailDrawer';

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
  const [query, setQuery] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') ?? ''
  );
  const [status, setStatus] = useState<string>('all');
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
  });

  const students = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
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
            title={debouncedQuery || status !== 'all' ? 'No students match your filters' : 'No students yet'}
            description={
              debouncedQuery || status !== 'all'
                ? 'Try adjusting your search or clearing the filters.'
                : 'Add your first student to get started.'
            }
            action={
              debouncedQuery || status !== 'all' ? (
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
                    <TableHead>Class</TableHead>
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
                        <Badge variant={statusBadge[s.status].variant}>
                          {statusBadge[s.status].label}
                        </Badge>
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
                  </div>
                  <Badge variant={statusBadge[s.status].variant}>
                    {statusBadge[s.status].label}
                  </Badge>
                </div>
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
        columns={['firstName', 'lastName', 'phone', 'email', 'rollNumber', 'admissionNumber', 'class', 'section', 'gender', 'guardianPhone', 'guardianName', 'guardianEmail']}
        sample={['Ali', 'Khan', '03001234567', 'ali@example.com', 'STD-2001', 'ADM-2001', 'Grade 5', 'A', 'male', '03009998888', 'Imran Khan', 'imran@example.com']}
        filename="students-template.csv"
        onImport={async (csv) => (await bulkImport({ csv }).unwrap()).data}
      />
    </div>
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
