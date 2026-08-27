'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, BookOpen, Trash2, ChevronLeft, ChevronRight, Filter, Check, UserPlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
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
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetUsersQuery } from '@/store/api/usersApi';
import {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useGetEnrollmentRequestsQuery,
  useApproveEnrollmentMutation,
  useRejectEnrollmentMutation,
} from '@/store/api/subjectsApi';
import { getErrorMessage } from '@/lib/get-error-message';

const PAGE_SIZE = 10;

export function SubjectsView() {
  const { data, isLoading } = useGetSubjectsQuery();
  const subjects = data?.data ?? [];
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteSubject, { isLoading: deleting }] = useDeleteSubjectMutation();

  const unassignedCount = useMemo(() => subjects.filter((s) => !s.teacherId).length, [subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = subjects;
    if (unassignedOnly) rows = rows.filter((s) => !s.teacherId);
    if (!q) return rows;
    return rows.filter((s) =>
      [s.name, s.code, s.className, s.teacherName].some((v) => (v ?? '').toLowerCase().includes(q))
    );
  }, [subjects, query, unassignedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id).unwrap();
      toast.success('Subject deleted');
      setConfirmId(null);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not delete subject'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description={isLoading ? 'Loading…' : `${filtered.length} of ${subjects.length} subjects`}
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Add subject</Button>}
      />

      <EnrollmentRequests />

      {subjects.length > 0 && (
        <Card className="space-y-3 p-4">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Search by name, code, class or teacher…"
          />
          {unassignedCount > 0 && (
            <button
              type="button"
              onClick={() => { setUnassignedOnly((v) => !v); setPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                unassignedOnly
                  ? 'border-warning bg-warning-soft text-warning'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <AlertTriangle size={12} /> {unassignedCount} unassigned {unassignedOnly ? '· showing only these' : ''}
            </button>
          )}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : subjects.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="No subjects yet" description="Build your subject catalog — assign classes and teachers." action={<Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Add subject</Button>} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Filter} title="No subjects match your search" description="Try a different term." action={<Button variant="secondary" size="sm" onClick={() => setQuery('')}>Clear search</Button>} /></Card>
      ) : (
        <>
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Subject</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.code ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{s.className ?? 'All'}</TableCell>
                      <TableCell>
                        {s.teacherName ? (
                          <span className="text-muted-foreground">{s.teacherName}</span>
                        ) : (
                          <Badge variant="warning" title="No teacher assigned">
                            <AlertTriangle size={11} /> Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={s.isElective ? 'warning' : 'neutral'}>{s.isElective ? 'Elective' : 'Core'}</Badge></TableCell>
                      <TableCell className="text-right">
                        {confirmId === s.id ? (
                          <div className="inline-flex flex-col items-end gap-1.5">
                            {s.enrolledCount > 0 && (
                              <p className="text-xs text-warning">{s.enrolledCount} student{s.enrolledCount === 1 ? '' : 's'} currently enrolled</p>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                              <Button variant="danger" size="sm" loading={deleting} onClick={() => handleDelete(s.id)}>Delete</Button>
                            </span>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmId(s.id)} aria-label="Delete subject" className="rounded-lg p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          <div className="space-y-3 md:hidden">
            {paged.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.code ? `${s.code} · ` : ''}{s.className ?? 'All classes'}{s.teacherName ? ` · ${s.teacherName}` : ''}</p>
                  </div>
                  <Badge variant={s.isElective ? 'warning' : 'neutral'}>{s.isElective ? 'Elective' : 'Core'}</Badge>
                </div>
                {!s.teacherName && (
                  <Badge variant="warning" className="mt-2"><AlertTriangle size={11} /> No teacher assigned</Badge>
                )}
                <div className="mt-3 flex flex-col items-end gap-1.5 border-t border-border pt-3">
                  {confirmId === s.id ? (
                    <>
                      {s.enrolledCount > 0 && (
                        <p className="text-xs text-warning">{s.enrolledCount} student{s.enrolledCount === 1 ? '' : 's'} currently enrolled</p>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                        <Button variant="danger" size="sm" loading={deleting} onClick={() => handleDelete(s.id)}>Delete</Button>
                      </span>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirmId(s.id)}>
                      <Trash2 size={15} /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {pageSafe} of {totalPages} · {filtered.length} subjects</p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)} aria-label="Previous"><ChevronLeft size={16} /></Button>
              <Button variant="secondary" size="icon" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)} aria-label="Next"><ChevronRight size={16} /></Button>
            </div>
          </div>
        </>
      )}

      <AddSubjectDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function EnrollmentRequests() {
  const { data } = useGetEnrollmentRequestsQuery({ status: 'pending' });
  const [approve, { isLoading: approving }] = useApproveEnrollmentMutation();
  const [reject, { isLoading: rejecting }] = useRejectEnrollmentMutation();
  const reqs = data?.data ?? [];
  if (reqs.length === 0) return null;

  const decide = async (fn: (id: string) => any, id: string, ok: string) => {
    try { await fn(id).unwrap(); toast.success(ok); }
    catch (e: any) { toast.error(getErrorMessage(e, 'Could not update request')); }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-border p-4">
        <UserPlus size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Elective enrollment requests</h3>
        <Badge variant="warning" className="ml-1">{reqs.length}</Badge>
      </div>
      <ul className="divide-y divide-border">
        {reqs.map((rq) => (
          <li key={rq.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {rq.studentName} <span className="font-normal text-muted-foreground">→ {rq.subjectName}</span>
              </p>
              {rq.rollNumber && <p className="text-xs text-muted-foreground">{rq.rollNumber}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={approving || rejecting} onClick={() => decide(reject, rq.id, 'Request rejected')}>Reject</Button>
              <Button size="sm" disabled={approving || rejecting} onClick={() => decide(approve, rq.id, 'Enrolled')}><Check size={15} /> Approve</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().optional(),
  classId: z.string().optional(),
  teacherId: z.string().optional(),
  isElective: z.boolean().optional(),
});
type SubjectForm = z.infer<typeof schema>;

function AddSubjectDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: classesRes } = useGetClassesQuery();
  const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });
  const classes = classesRes?.data ?? [];
  const teachers = teachersRes?.data ?? [];
  const [createSubject, { isLoading }] = useCreateSubjectMutation();

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SubjectForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', classId: '', teacherId: '', isElective: false },
  });
  const isElective = watch('isElective');

  const onSubmit = async (values: SubjectForm) => {
    try {
      await createSubject({
        name: values.name,
        code: values.code || undefined,
        classId: values.classId || undefined,
        teacherId: values.teacherId || undefined,
        isElective: values.isElective ?? false,
      }).unwrap();
      toast.success('Subject added');
      reset();
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not add subject'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Add Subject</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="name">Subject name</Label>
                <Input id="name" placeholder="e.g. Mathematics" {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div className="col-span-2">
                <Label htmlFor="code">Code (optional)</Label>
                <Input id="code" placeholder="e.g. MATH-101" {...register('code')} />
              </div>
            </div>
            <div>
              <Label>Class (optional)</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value || 'all'} onValueChange={(v) => field.onChange(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Teacher (optional)</Label>
              <Controller
                control={control}
                name="teacherId"
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={!!isElective}
                onChange={(e) => setValue('isElective', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
              />
              Elective subject
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Add subject</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
