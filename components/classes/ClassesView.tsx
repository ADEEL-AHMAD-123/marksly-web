'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { Plus, School, Trash2, X, Users, AlertCircle, Layers, ChevronLeft, ChevronRight, Filter, Pencil, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage, getErrorCode } from '@/lib/get-error-message';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { SearchInput } from '@/components/ui/search-input';
import {
  useGetClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  type ClassItem,
} from '@/store/api/classesApi';
import { useGetUsersQuery } from '@/store/api/usersApi';
import { useGetActiveTermsQuery, useGetTermsQuery } from '@/store/api/termsApi';
import { useGetGradingSchemesQuery } from '@/store/api/gradingSchemesApi';

const schema = z.object({
  name: z.string().min(1, 'Class name is required'),
  level: z.coerce.number({ invalid_type_error: 'Level must be a number' }).int().min(0).max(20),
  termId: z.string().min(1, 'Select a term'),
  // '' means "use institution default" — resolved server-side in
  // grading-scheme.service.ts's resolveSchemeForClass().
  gradingSchemeId: z.string().optional(),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'Required'),
        capacity: z.coerce.number().int().min(1).max(200).optional(),
        teacherId: z.string().optional(),
      })
    )
    .min(1, 'Add at least one section'),
});

type Form = z.infer<typeof schema>;

const PAGE_SIZE = 9;

export function ClassesView() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useGetClassesQuery();
  const [createClass, { isLoading: creating }] = useCreateClassMutation();
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation();
  const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });
  // termId is now required on every class (backend class.validator.ts) —
  // since multiple terms can be active at once, default new classes to the
  // most recently-started active term but let the admin pick another.
  const { data: activeTermsRes } = useGetActiveTermsQuery();
  const activeTerms = activeTermsRes?.data ?? [];
  // Full term list — needed so that editing a class whose term is
  // 'upcoming'/'closed' (not currently active) still has that term
  // available as a selectable option; otherwise the select silently falls
  // back to an unmatched/empty value and zod blocks saving ANY edit.
  const { data: allTermsRes } = useGetTermsQuery();
  const allTerms = allTermsRes?.data ?? [];
  // Every scheme, of every type, is always selectable here — a class's
  // grading scheme is deliberately independent of the institution's usual
  // academicStructure (see class.model.ts's gradingSchemeId comment), so
  // this must never be filtered by type.
  const { data: gradingSchemesRes } = useGetGradingSchemesQuery();
  const gradingSchemes = gradingSchemesRes?.data ?? [];
  const defaultGradingScheme = gradingSchemes.find((s) => s.isDefault);
  const termOptions = useMemo(() => {
    const options = [...activeTerms];
    if (editing?.termId && !options.some((t) => t.id === editing.termId)) {
      const currentTerm = allTerms.find((t) => t.id === editing.termId);
      if (currentTerm) options.push(currentTerm);
    }
    return options;
  }, [activeTerms, allTerms, editing]);
  const teachers = teachersRes?.data ?? [];
  const classes = data?.data ?? [];
  const noTerms = activeTerms.length === 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) =>
      [c.name, c.termName, ...c.sections.map((s) => s.name)].some((v) => (v ?? '').toLowerCase().includes(q))
    );
  }, [classes, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const [typeLockedError, setTypeLockedError] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', level: 1, termId: '', gradingSchemeId: '', sections: [{ name: 'A', capacity: 40, teacherId: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'sections' });

  useEffect(() => {
    if (!open) return;
    setTypeLockedError(null);
    if (editing) {
      reset({
        name: editing.name,
        level: editing.level,
        termId: editing.termId ?? '',
        gradingSchemeId: editing.gradingSchemeId ?? '',
        sections: editing.sections.map((s) => ({ id: s.id, name: s.name, capacity: s.capacity ?? 40, teacherId: s.teacherId ?? '' })),
      });
    } else {
      reset({ name: '', level: 1, termId: activeTerms[0]?.id ?? '', gradingSchemeId: '', sections: [{ name: 'A', capacity: 40, teacherId: '' }] });
    }
  }, [open, editing, reset, activeTerms]);

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: ClassItem) => { setEditing(c); setOpen(true); };

  const onSubmit = async (values: Form) => {
    const sections = values.sections.map((s) => ({
      id: s.id || undefined,
      name: s.name,
      capacity: s.capacity,
      teacherId: s.teacherId || undefined,
    }));
    setTypeLockedError(null);
    try {
      if (editing) {
        await updateClass({
          id: editing.id,
          body: {
            name: values.name,
            level: values.level,
            termId: values.termId,
            // '' (the "use institution default" option) is sent as `null`
            // to explicitly unset any previously-assigned scheme, rather
            // than being dropped from the body (which would leave it
            // untouched instead).
            gradingSchemeId: values.gradingSchemeId ? values.gradingSchemeId : null,
            sections,
          },
        }).unwrap();
        toast.success('Class updated');
      } else {
        await createClass({
          name: values.name,
          level: values.level,
          termId: values.termId,
          gradingSchemeId: values.gradingSchemeId || undefined,
          sections,
        }).unwrap();
        toast.success('Class created');
      }
      setOpen(false);
    } catch (e: any) {
      if (getErrorCode(e) === 'GRADING_SCHEME_TYPE_LOCKED') {
        const msg = getErrorMessage(e, 'This class already has recorded results under a different grading type — its scheme type cannot be changed.');
        setTypeLockedError(msg);
        toast.error(msg);
      } else {
        toast.error(getErrorMessage(e, 'Could not save class'));
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description={isLoading ? 'Loading…' : `${filtered.length} of ${classes.length} classes`}
        actions={<Button size="sm" onClick={openAdd}><Plus size={16} /> Add Class</Button>}
      />

      {!isLoading && !isError && classes.length > 0 && (
        <Card className="p-4">
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search by class name, year or section…" />
        </Card>
      )}

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title="Couldn't load classes" description="Check that the API is running and try again." action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-24 w-full" /></Card>)}
        </div>
      ) : classes.length === 0 ? (
        <Card><EmptyState icon={School} title="No classes yet" description="Create your first class and sections so you can start enrolling students." action={<Button size="sm" onClick={openAdd}><Plus size={16} /> Add Class</Button>} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Filter} title="No classes match your search" description="Try a different term." action={<Button variant="secondary" size="sm" onClick={() => setQuery('')}>Clear search</Button>} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((c) => {
              const total = c.sections.reduce((sum, s) => sum + (s.currentCount || 0), 0);
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><School size={18} /></span>
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.termName ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="neutral">Level {c.level}</Badge>
                      <button onClick={() => openEdit(c)} aria-label="Edit class" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={15} /></button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {c.sections.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Layers size={11} /> {s.name}{s.capacity ? <span className="opacity-60">/{s.capacity}</span> : null}</span>
                        <span className={`inline-flex items-center gap-1 ${s.teacherName ? 'text-muted-foreground' : 'text-warning'}`}>
                          <UserCog size={11} /> {s.teacherName ?? 'Unassigned'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                    <Users size={14} /> {total} student{total === 1 ? '' : 's'} · {c.sections.length} section{c.sections.length === 1 ? '' : 's'}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {pageSafe} of {totalPages} · {filtered.length} classes</p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)} aria-label="Previous"><ChevronLeft size={16} /></Button>
              <Button variant="secondary" size="icon" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)} aria-label="Next"><ChevronRight size={16} /></Button>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Class drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Class' : 'Add Class'}</h2>
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {/* Same pattern as StudentFormDrawer's "no classes yet" guard —
                  a class can't be created without a term to attach it to
                  (termId is required server-side, class.service.ts's
                  create() 400s with INVALID_TERM otherwise), but leaving the
                  term dropdown just silently empty made that failure mode
                  confusing rather than actionable. */}
              {noTerms && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>Set up your academic year first (Academic Terms page) — classes need a term to belong to.</span>
                </div>
              )}

              <div>
                <Label htmlFor="name">Class name</Label>
                <Input id="name" placeholder="e.g. Grade 5" {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="level">Level</Label>
                  <Input id="level" type="number" {...register('level')} />
                  {errors.level && <p className="mt-1 text-xs text-danger">{errors.level.message}</p>}
                </div>
                <div>
                  <Label htmlFor="termId">Term</Label>
                  <select
                    id="termId"
                    {...register('termId')}
                    className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a term</option>
                    {termOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.status !== 'active' ? ` (${t.status})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.termId && <p className="mt-1 text-xs text-danger">{errors.termId.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="gradingSchemeId">Grading scheme</Label>
                <select
                  id="gradingSchemeId"
                  {...register('gradingSchemeId')}
                  className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">
                    Use institution default{defaultGradingScheme ? ` (${defaultGradingScheme.name})` : ''}
                  </option>
                  {gradingSchemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Determines how marks are graded for this class — percentage/letter, GPA, Cambridge, or pass/fail.
                </p>
                {typeLockedError && (
                  <p className="mt-1.5 text-xs text-danger">{typeLockedError}</p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="mb-0">Sections &amp; teachers</Label>
                  <button type="button" onClick={() => append({ name: '', capacity: 40, teacherId: '' })} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus size={13} /> Add section
                  </button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, i) => (
                    <div key={field.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Name (e.g. A)" className="flex-1" {...register(`sections.${i}.name` as const)} />
                        <Input type="number" placeholder="Capacity" className="w-24" {...register(`sections.${i}.capacity` as const)} />
                        <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove section" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-2">
                        <select
                          {...register(`sections.${i}.teacherId` as const)}
                          className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Class teacher — Unassigned</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.sections && <p className="mt-1 text-xs text-danger">{(errors.sections as any).message || 'Check section names'}</p>}
                <p className="mt-2 text-xs text-muted-foreground">The assigned teacher can mark attendance for that section.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
              <Button type="submit" loading={creating || updating} disabled={noTerms && !editing}>{editing ? 'Save changes' : 'Create class'}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
