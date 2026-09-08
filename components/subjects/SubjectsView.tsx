'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, BookOpen, Trash2, Pencil, ChevronLeft, ChevronRight, Filter, Check, UserPlus, AlertTriangle } from 'lucide-react';
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
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetEnrollmentRequestsQuery,
  useApproveEnrollmentMutation,
  useRejectEnrollmentMutation,
  type Subject,
} from '@/store/api/subjectsApi';
import { getErrorMessage } from '@/lib/get-error-message';
import { useTerminology } from '@/lib/terminology';

const PAGE_SIZE = 10;

export function SubjectsView() {
  const terminology = useTerminology();
  const { data, isLoading } = useGetSubjectsQuery();
  const subjects = data?.data ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteSubject, { isLoading: deleting }] = useDeleteSubjectMutation();

  // A subject counts as "unassigned"/needs-attention when:
  // - it has multiple sections and AT LEAST ONE has no effective teacher
  //   (sectionCoverage's null-teacherId rows), or
  // - it has no sections to disambiguate and simply has no fallback teacher.
  const isUnassigned = (s: Subject) =>
    s.sectionCoverage.length > 0
      ? s.sectionCoverage.some((r) => !r.teacherId)
      : !s.teacherId;
  const unassignedCount = useMemo(() => subjects.filter(isUnassigned).length, [subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = subjects;
    if (unassignedOnly) rows = rows.filter(isUnassigned);
    if (!q) return rows;
    return rows.filter((s) =>
      [s.name, s.code, s.className, s.teacherName, ...s.sectionCoverage.map((r) => r.teacherName)]
        .some((v) => (v ?? '').toLowerCase().includes(q))
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
            placeholder={`Search by name, code, ${terminology.classUnit.toLowerCase()} or teacher…`}
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
                    <TableHead>{terminology.classUnit}</TableHead>
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
                      <TableCell className="text-muted-foreground">{s.className ?? `All ${terminology.classUnitPlural.toLowerCase()}`}</TableCell>
                      <TableCell><TeacherCell subject={s} /></TableCell>
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
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => setEditing(s)} aria-label="Edit subject" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => setConfirmId(s.id)} aria-label="Delete subject" className="rounded-lg p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger">
                              <Trash2 size={16} />
                            </button>
                          </span>
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
                    <p className="text-xs text-muted-foreground">{s.code ? `${s.code} · ` : ''}{s.className ?? `All ${terminology.classUnitPlural.toLowerCase()}`}{s.teacherName ? ` · ${s.teacherName}` : ''}</p>
                  </div>
                  <Badge variant={s.isElective ? 'warning' : 'neutral'}>{s.isElective ? 'Elective' : 'Core'}</Badge>
                </div>
                <div className="mt-2"><TeacherCell subject={s} /></div>
                <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                    <Pencil size={15} /> Edit
                  </Button>
                  {confirmId === s.id ? (
                    <div className="flex flex-col items-end gap-1.5">
                      {s.enrolledCount > 0 && (
                        <p className="text-xs text-warning">{s.enrolledCount} student{s.enrolledCount === 1 ? '' : 's'} currently enrolled</p>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                        <Button variant="danger" size="sm" loading={deleting} onClick={() => handleDelete(s.id)}>Delete</Button>
                      </span>
                    </div>
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

      <SubjectDrawer open={open} subject={null} onClose={() => setOpen(false)} />
      <SubjectDrawer open={!!editing} subject={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// Shows the fallback teacher when every section uses the same one, or a
// compact per-section breakdown ("Section A: Mr. Bilal · Section B:
// Unassigned") once any override exists — so an admin can see at a glance
// whether a subject is fully covered without opening the edit drawer.
function TeacherCell({ subject }: { subject: Subject }) {
  if (subject.sectionCoverage.length === 0) {
    return subject.teacherName ? (
      <span className="text-muted-foreground">{subject.teacherName}</span>
    ) : (
      <Badge variant="warning" title="No teacher assigned">
        <AlertTriangle size={11} /> Unassigned
      </Badge>
    );
  }
  const uncovered = subject.sectionCoverage.filter((r) => !r.teacherId).length;
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {uncovered > 0 && (
        <span className="mb-0.5">
          <Badge variant="warning"><AlertTriangle size={11} /> {uncovered} section{uncovered === 1 ? '' : 's'} unassigned</Badge>
        </span>
      )}
      {subject.sectionCoverage.map((r) => (
        <span key={r.sectionId} className="text-muted-foreground">
          <span className="font-medium text-foreground">{r.sectionName ?? 'Section'}:</span>{' '}
          {r.teacherName ?? <span className="font-medium text-warning">Unassigned</span>}
        </span>
      ))}
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
  // A subject can no longer be created without a class — matches the
  // backend's requiredClassId (subject.validator.ts). Client-side too, so
  // the error shows up next to the field immediately instead of only after
  // a round trip to the server.
  classId: z.string().min(1, 'Select a class for this subject'),
  teacherId: z.string().optional(),
  isElective: z.boolean().optional(),
});
type SubjectForm = z.infer<typeof schema>;

function SubjectDrawer({ open, subject, onClose }: { open: boolean; subject: Subject | null; onClose: () => void }) {
  const terminology = useTerminology();
  const isEdit = !!subject;
  const { data: classesRes } = useGetClassesQuery();
  const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });
  const classes = classesRes?.data ?? [];
  const teachers = teachersRes?.data ?? [];
  const [createSubject, { isLoading: creating }] = useCreateSubjectMutation();
  const [updateSubject, { isLoading: updating }] = useUpdateSubjectMutation();
  const isLoading = creating || updating;

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SubjectForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', classId: '', teacherId: '', isElective: false },
  });
  const isElective = watch('isElective');
  const classId = watch('classId');
  const fallbackTeacherId = watch('teacherId');
  const selectedClass = classes.find((c) => c.id === classId);

  // Per-section teacher overrides, keyed by sectionId. An empty string
  // means "no override — use the fallback teacher above." Rebuilt whenever
  // the selected class changes so stale entries from a previously-selected
  // class never get submitted for a different one.
  const [sectionTeacherMap, setSectionTeacherMap] = useState<Record<string, string>>({});

  // Every section of the selected class that still has NO resolved teacher
  // (no override, no fallback) — computed the same way the backend's
  // assertFullyAssigned() does, so the UI can block submission and explain
  // exactly what's missing before a round trip fails with a 400.
  const missingSections = selectedClass
    ? selectedClass.sections.filter((sec) => !(sectionTeacherMap[sec.id] || fallbackTeacherId))
    : [];
  const coveredCount = selectedClass ? selectedClass.sections.length - missingSections.length : 0;
  // A class with 0 sections still needs the fallback teacher directly —
  // there's nothing else that could cover it (mirrors the backend's
  // TEACHER_REQUIRED case).
  const needsFallbackTeacher = !!selectedClass && selectedClass.sections.length === 0 && !fallbackTeacherId;

  // (Re)populate the form whenever the drawer opens — either with an
  // existing subject's values (edit) or blank defaults (add).
  useEffect(() => {
    if (!open) return;
    if (subject) {
      reset({
        name: subject.name,
        code: subject.code ?? '',
        classId: subject.classId ?? '',
        teacherId: subject.teacherId ?? '',
        isElective: subject.isElective,
      });
      setSectionTeacherMap(Object.fromEntries(subject.sectionTeachers.map((r) => [r.sectionId, r.teacherId])));
    } else {
      reset({ name: '', code: '', classId: '', teacherId: '', isElective: false });
      setSectionTeacherMap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subject?.id]);

  // When the class changes (including to "All classes"), drop any
  // per-section overrides that no longer belong to the new class's section
  // list — carrying them over would silently apply "Section A's teacher"
  // to a same-named-but-different section in another class.
  useEffect(() => {
    if (!open) return;
    const validIds = new Set((selectedClass?.sections ?? []).map((sec) => sec.id));
    setSectionTeacherMap((prev) => {
      const next: Record<string, string> = {};
      for (const [sid, tid] of Object.entries(prev)) if (validIds.has(sid)) next[sid] = tid;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, open]);

  const onSubmit = async (values: SubjectForm) => {
    // Client-side mirror of the backend's full-coverage requirement — catch
    // it here with a specific, actionable message instead of round-tripping
    // to the server just to get the same answer back as a generic error.
    if (needsFallbackTeacher) {
      toast.error(`Select a teacher for this subject — ${selectedClass!.name} has no sections to assign individually`);
      return;
    }
    if (missingSections.length > 0) {
      toast.error(`Assign a teacher for every section before saving — missing: ${missingSections.map((s) => s.name).join(', ')}`);
      return;
    }

    const sectionTeachers = Object.entries(sectionTeacherMap)
      .filter(([, teacherId]) => !!teacherId)
      .map(([sectionId, teacherId]) => ({ sectionId, teacherId }));

    const body = {
      name: values.name,
      // Deliberately NOT coerced to undefined when empty: on create, an
      // empty string still tells the backend "no code provided, generate
      // one" (same outcome as omitting it). On edit, sending '' explicitly
      // is how clearing the field triggers a fresh regenerated code —
      // coercing to undefined here would make the backend see the field as
      // untouched and silently keep the old code instead.
      code: values.code,
      classId: values.classId,
      teacherId: values.teacherId || undefined,
      sectionTeachers,
      isElective: values.isElective ?? false,
    };

    try {
      if (isEdit && subject) {
        await updateSubject({ id: subject.id, body }).unwrap();
        toast.success('Subject updated');
      } else {
        await createSubject(body).unwrap();
        toast.success('Subject added');
      }
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, isEdit ? 'Could not update subject' : 'Could not add subject'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Subject' : 'Add Subject'}</h2>
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
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="Auto-generated from name + class" {...register('code')} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEdit
                    ? 'Leave blank to auto-generate a fresh code. Used to tell apart subjects with the same name across different classes.'
                    : 'Leave blank and one will be generated for you (e.g. "MATH-8") — must be unique per institution either way.'}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="classId">{terminology.classUnit}</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="classId"><SelectValue placeholder={`Select a ${terminology.classUnit.toLowerCase()}…`} /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.classId ? (
                <p className="mt-1 text-xs text-danger">{errors.classId.message}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Every subject belongs to one {terminology.classUnit.toLowerCase()} — pick it first to assign teachers below.
                </p>
              )}
            </div>

            {selectedClass && (
              <div>
                <Label>{selectedClass.sections.length > 1 ? 'Default teacher' : 'Teacher'}</Label>
                <Controller
                  control={control}
                  name="teacherId"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select a teacher…" /></SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedClass.sections.length > 1 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used for any section below left as &quot;Same as default&quot;. You can leave this unset only if every section has its own teacher below.
                  </p>
                ) : needsFallbackTeacher || (selectedClass.sections.length === 1 && !fallbackTeacherId) ? (
                  <p className="mt-1 text-xs text-danger">A teacher is required — this subject has no other section to fall back on.</p>
                ) : null}
              </div>
            )}

            {selectedClass && selectedClass.sections.length > 1 && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">Per-section teacher (optional overrides)</p>
                  <Badge variant={coveredCount === selectedClass.sections.length ? 'success' : 'warning'}>
                    {coveredCount} of {selectedClass.sections.length} covered
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Give a different section its own teacher for this subject — e.g. Section A and Section B can have different Math teachers. Every section must end up with a teacher, either here or via the default above.
                </p>
                <div className="space-y-2 pt-1">
                  {selectedClass.sections.map((sec) => {
                    const isCovered = !!(sectionTeacherMap[sec.id] || fallbackTeacherId);
                    return (
                      <div key={sec.id} className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${isCovered ? 'text-foreground' : 'text-danger'}`}>
                          {sec.name}{!isCovered && ' — needs a teacher'}
                        </span>
                        <Select
                          value={sectionTeacherMap[sec.id] || 'default'}
                          onValueChange={(v) =>
                            setSectionTeacherMap((prev) => ({ ...prev, [sec.id]: v === 'default' ? '' : v }))
                          }
                        >
                          <SelectTrigger className={`h-8 w-[180px] text-xs ${!isCovered ? 'border-danger' : ''}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Same as default</SelectItem>
                            {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
          <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
            <p className="text-xs text-danger">
              {!classId
                ? 'Select a class to continue.'
                : needsFallbackTeacher
                ? 'Select a teacher to continue.'
                : missingSections.length > 0
                ? `${missingSections.length} section${missingSections.length === 1 ? '' : 's'} still need${missingSections.length === 1 ? 's' : ''} a teacher.`
                : ''}
            </p>
            <span className="flex items-center gap-2">
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
              <Button
                type="submit"
                loading={isLoading}
                disabled={!classId || needsFallbackTeacher || missingSections.length > 0}
              >
                {isEdit ? 'Save changes' : 'Add subject'}
              </Button>
            </span>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
