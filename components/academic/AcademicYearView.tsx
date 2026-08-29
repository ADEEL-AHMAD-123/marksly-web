'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange, Plus, ArrowRight, X, GraduationCap, AlertTriangle, Undo2, ChevronLeft,
  Pencil, Lock, Star, Info, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getErrorMessage, getErrorCode } from '@/lib/get-error-message';
import { useTerminology } from '@/lib/terminology';
import { useGetMyInstitutionQuery } from '@/store/api/institutionApi';
import {
  useGetTermsQuery,
  useCreateTermMutation,
  useUpdateTermMutation,
  usePreviewPromotionMutation,
  usePromoteStudentsMutation,
  useUndoPromotionMutation,
  type Term,
  type TermType,
  type TermStatus,
  type PromotionPreview,
} from '@/store/api/termsApi';
import {
  useGetGradingSchemesQuery,
  useCreateGradingSchemeMutation,
  useUpdateGradingSchemeMutation,
  useSetDefaultGradingSchemeMutation,
  type GradingScheme,
  type GradingSchemeType,
  type GradingSchemeConfig,
  type RepeatPolicy,
  type PercentageLetterBand,
  type GpaGradePoint,
  type CambridgePredictedBand,
} from '@/store/api/gradingSchemesApi';
import { useGetClassesQuery, type ClassItem } from '@/store/api/classesApi';
import { useGetStudentsQuery } from '@/store/api/studentsApi';
import { useDebounce } from '@/hooks/useDebounce';

const TERM_TYPE_LABEL: Record<TermType, string> = {
  academic_year: 'Academic Year',
  semester: 'Semester',
  trimester: 'Trimester',
  short_session: 'Short Session',
  custom: 'Custom',
};

// Maps an institution's academicStructure to the TermType a new term
// should default to — mirrors term.service.ts's own default-derivation so
// the create form's initial pick matches what the backend would have
// chosen anyway.
const STRUCTURE_DEFAULT_TERM_TYPE: Record<string, TermType> = {
  yearly: 'academic_year',
  semester: 'semester',
  short_session: 'short_session',
  custom: 'custom',
};

export function AcademicYearView() {
  const terminology = useTerminology();
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${terminology.termPlural} & Grading`}
        description={`Manage ${terminology.termPlural.toLowerCase()}, promote students, and configure grading schemes.`}
      />
      <Tabs defaultValue="terms">
        <TabsList>
          <TabsTrigger value="terms">{terminology.termPlural}</TabsTrigger>
          <TabsTrigger value="grading">Grading Schemes</TabsTrigger>
        </TabsList>
        <TabsContent value="terms"><TermsTab /></TabsContent>
        <TabsContent value="grading"><GradingSchemesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TERMS TAB
   ══════════════════════════════════════════════════════════════════════════ */

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

const STATUS_PILL: Record<TermStatus, { label: string; variant: 'success' | 'neutral' | 'primary' }> = {
  active: { label: 'Active', variant: 'success' },
  upcoming: { label: 'Upcoming', variant: 'primary' },
  closed: { label: 'Closed', variant: 'neutral' },
};

function TermsTab() {
  const terminology = useTerminology();
  const { data, isLoading } = useGetTermsQuery();
  const terms = data?.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<Term | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  // Kept at this level (not inside PromoteDrawer) so the Undo option
  // survives the drawer closing.
  const [lastBatch, setLastBatch] = useState<{ batchId: string; moved: number; graduated: number; left: number } | null>(null);
  const [undoPromotion, { isLoading: undoing }] = useUndoPromotionMutation();

  const groups = useMemo(() => {
    return {
      active: terms.filter((t) => t.status === 'active'),
      upcoming: terms.filter((t) => t.status === 'upcoming'),
      closed: terms.filter((t) => t.status === 'closed'),
    };
  }, [terms]);

  const handleUndo = async () => {
    if (!lastBatch) return;
    try {
      const res = await undoPromotion(lastBatch.batchId).unwrap();
      const notes: string[] = [];
      if (res.data.skipped) notes.push(`${res.data.skipped} could not be reverted (already changed since)`);
      if (res.data.overLimit) notes.push(`${res.data.overLimit} skipped — would exceed your plan's student limit`);
      toast.success(`Reverted ${res.data.reverted} student(s)${notes.length ? ` — ${notes.join('; ')}` : ''}`);
      setLastBatch(null);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not undo promotion'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setPromoteOpen(true)}>
          <GraduationCap size={16} /> Promote students
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Add {terminology.term.toLowerCase()}
        </Button>
      </div>

      {lastBatch && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary-soft-foreground">
          <span>
            <strong>{lastBatch.moved}</strong> promoted, <strong>{lastBatch.graduated}</strong> graduated
            {lastBatch.left > 0 && <>, <strong>{lastBatch.left}</strong> marked as left</>} just now.
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" loading={undoing} onClick={handleUndo}><Undo2 size={14} /> Undo</Button>
            <button onClick={() => setLastBatch(null)} className="text-primary-soft-foreground/70 hover:text-primary-soft-foreground"><X size={16} /></button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Card className="p-5"><Skeleton className="h-24 w-full" /></Card>
          <Card className="p-5"><Skeleton className="h-24 w-full" /></Card>
        </div>
      ) : terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarRange}
            title={`No ${terminology.termPlural.toLowerCase()} yet`}
            description={`Create your first ${terminology.term.toLowerCase()} to start building ${terminology.classUnitPlural.toLowerCase()} and enrolling students.`}
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add {terminology.term.toLowerCase()}</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <TermGroup label="Active" terms={groups.active} onEdit={setEditTerm} emphasize />
          <TermGroup label="Upcoming" terms={groups.upcoming} onEdit={setEditTerm} />
          <TermGroup label="Closed" terms={groups.closed} onEdit={setEditTerm} />
        </div>
      )}

      <TermFormSheet mode="create" open={createOpen} onClose={() => setCreateOpen(false)} />
      <TermFormSheet mode="edit" term={editTerm} open={!!editTerm} onClose={() => setEditTerm(null)} />
      <PromoteDrawer
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onPromoted={(res) => setLastBatch(res)}
      />
    </div>
  );
}

function TermGroup({ label, terms, onEdit, emphasize }: { label: string; terms: Term[]; onEdit: (t: Term) => void; emphasize?: boolean }) {
  if (terms.length === 0) return null;
  return (
    <div>
      <h3 className={cn('mb-2.5 text-sm font-semibold', emphasize ? 'text-foreground' : 'text-muted-foreground')}>
        {label} <span className="font-normal text-muted-foreground">({terms.length})</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {terms.map((t) => (
          <Card key={t.id} className={cn('p-4', emphasize && 'border-primary/30')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{t.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{TERM_TYPE_LABEL[t.type]}</Badge>
                  <Badge variant={STATUS_PILL[t.status].variant}>{STATUS_PILL[t.status].label}</Badge>
                </div>
              </div>
              <button
                onClick={() => onEdit(t)}
                aria-label={`Edit ${t.name}`}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil size={14} />
              </button>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">
              {formatDate(t.startDate)} – {formatDate(t.endDate)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TermFormSheet({
  mode, term, open, onClose,
}: {
  mode: 'create' | 'edit';
  term?: Term | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: instData } = useGetMyInstitutionQuery();
  const structure = instData?.data?.academicStructure;
  const defaultType = (structure && STRUCTURE_DEFAULT_TERM_TYPE[structure]) || 'academic_year';

  const [createTerm, { isLoading: creating }] = useCreateTermMutation();
  const [updateTerm, { isLoading: updating }] = useUpdateTermMutation();
  const isLoading = creating || updating;

  const [name, setName] = useState('');
  const [type, setType] = useState<TermType>(defaultType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TermStatus>('upcoming');
  const [typeLockedError, setTypeLockedError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && term) {
      setName(term.name);
      setType(term.type);
      setStartDate(term.startDate ?? '');
      setEndDate(term.endDate ?? '');
      setStatus(term.status);
    } else {
      setName('');
      setType(defaultType);
      setStartDate('');
      setEndDate('');
      setStatus('upcoming');
    }
    setTypeLockedError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, term?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      if (mode === 'create') {
        await createTerm({
          name: name.trim(),
          type,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status,
        }).unwrap();
        toast.success('Term created');
      } else if (term) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status,
        };
        // Only send `type` if it actually changed — avoids tripping
        // TERM_LOCKED on saves that don't touch it at all.
        if (type !== term.type) body.type = type;
        await updateTerm({ id: term.id, body }).unwrap();
        toast.success('Term updated');
      }
      onClose();
    } catch (err: any) {
      if (getErrorCode(err) === 'TERM_LOCKED') {
        setTypeLockedError(getErrorMessage(err, 'This term already has enrollment or results, so its type can no longer be changed.'));
        if (term) setType(term.type);
        toast.error(getErrorMessage(err, 'Could not change term type'));
      } else {
        toast.error(getErrorMessage(err, mode === 'create' ? 'Could not create term' : 'Could not update term'));
      }
    }
  };

  const title = mode === 'create' ? 'Create term' : 'Edit term';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[420px]">
        <form onSubmit={submit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="term-name">Name</Label>
              <Input id="term-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fall 2026" />
            </div>
            <div>
              <Label htmlFor="term-type">Type</Label>
              <select
                id="term-type"
                value={type}
                onChange={(e) => setType(e.target.value as TermType)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(TERM_TYPE_LABEL) as TermType[]).map((t) => (
                  <option key={t} value={t}>{TERM_TYPE_LABEL[t]}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Individual terms can deviate from your institution's usual structure if needed (e.g. one short session inside an otherwise yearly setup).
              </p>
              {typeLockedError && (
                <p className="mt-1.5 flex items-start gap-1 text-xs text-danger">
                  <Lock size={12} className="mt-0.5 shrink-0" /> {typeLockedError}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="term-start">Start date</Label>
                <Input id="term-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="term-end">End date</Label>
                <Input id="term-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="term-status">Status</Label>
              <select
                id="term-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TermStatus)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Multiple terms can be active at the same time.</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>{mode === 'create' ? 'Create' : 'Save changes'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ── Promote students (migrated from the old single-year screen) ──────────── */

interface Row { fromClassId: string; fromSectionId: string; toClassId: string; toSectionId: string; excludeStudentIds: string[] }
interface LeaverRow { studentId: string; name: string; rollNumber: string; status: 'transferred' | 'withdrawn' | 'expelled'; reason: string }

const LEAVER_STATUSES: { value: LeaverRow['status']; label: string }[] = [
  { value: 'transferred', label: 'Transferred' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expelled', label: 'Expelled' },
];

function HoldBackPicker({ classId, sectionId, excluded, onToggle }: { classId: string; sectionId: string; excluded: string[]; onToggle: (id: string) => void }) {
  const { data, isFetching } = useGetStudentsQuery(
    { classId, sectionId, status: 'active', limit: 100, sortBy: 'rollNumber', sortOrder: 'asc' },
    { skip: !classId || !sectionId }
  );
  const students = data?.data ?? [];
  if (!classId || !sectionId) return null;
  return (
    <div className="mt-2 rounded-md border border-border bg-muted/40 p-2">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Hold back (repeating this grade) — unchecked students move up:</p>
      {isFetching ? (
        <Skeleton className="h-8 w-full" />
      ) : students.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active students in this section.</p>
      ) : (
        <div className="max-h-32 space-y-1 overflow-y-auto">
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={excluded.includes(s.id)}
                onChange={() => onToggle(s.id)}
                className="h-3.5 w-3.5 rounded border-input accent-[hsl(var(--primary))]"
              />
              {s.name} <span className="text-muted-foreground">· {s.rollNumber}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function PromoteDrawer({
  open, onClose, onPromoted,
}: {
  open: boolean;
  onClose: () => void;
  onPromoted: (res: { batchId: string; moved: number; graduated: number; left: number }) => void;
}) {
  const { data } = useGetClassesQuery({ all: true });
  const classes = data?.data ?? [];
  const [previewPromotion, { isLoading: previewing }] = usePreviewPromotionMutation();
  const [promote, { isLoading: promoting }] = usePromoteStudentsMutation();
  const [rows, setRows] = useState<Row[]>([{ fromClassId: '', fromSectionId: '', toClassId: '', toSectionId: '', excludeStudentIds: [] }]);
  const [graduate, setGraduate] = useState<string[]>([]);
  const [leavers, setLeavers] = useState<LeaverRow[]>([]);
  const [leaverSearch, setLeaverSearch] = useState('');
  const [preview, setPreview] = useState<PromotionPreview | null>(null);

  const debouncedLeaverSearch = useDebounce(leaverSearch, 350);
  const { data: searchResults } = useGetStudentsQuery(
    { search: debouncedLeaverSearch, status: 'active', limit: 6 },
    { skip: debouncedLeaverSearch.trim().length < 2 }
  );
  const searchMatches = (searchResults?.data ?? []).filter((s) => !leavers.some((l) => l.studentId === s.id));

  const sectionsOf = (classId: string) => classes.find((c) => c.id === classId)?.sections ?? [];
  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const toggleGrad = (id: string) => setGraduate((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  const toggleExclude = (i: number, studentId: string) => setRows((r) => r.map((x, idx) => idx === i
    ? { ...x, excludeStudentIds: x.excludeStudentIds.includes(studentId) ? x.excludeStudentIds.filter((id) => id !== studentId) : [...x.excludeStudentIds, studentId] }
    : x));
  const addLeaver = (s: { id: string; name: string; rollNumber: string }) => {
    setLeavers((l) => (l.some((x) => x.studentId === s.id) ? l : [...l, { studentId: s.id, name: s.name, rollNumber: s.rollNumber, status: 'transferred', reason: '' }]));
    setLeaverSearch('');
  };
  const updateLeaver = (studentId: string, patch: Partial<LeaverRow>) =>
    setLeavers((l) => l.map((x) => (x.studentId === studentId ? { ...x, ...patch } : x)));
  const removeLeaver = (studentId: string) => setLeavers((l) => l.filter((x) => x.studentId !== studentId));

  const reset = () => {
    setRows([{ fromClassId: '', fromSectionId: '', toClassId: '', toSectionId: '', excludeStudentIds: [] }]);
    setGraduate([]);
    setLeavers([]);
    setLeaverSearch('');
    setPreview(null);
  };

  const resolveTermId = (items: Row[], graduateClassIds: string[]): string | undefined => {
    const fromItem = items.find((r) => r.toClassId)?.toClassId;
    const classId = fromItem ?? graduateClassIds[0];
    return classId ? classes.find((c) => c.id === classId)?.termId ?? undefined : undefined;
  };

  const body = () => {
    const items = rows
      .filter((r) => r.fromClassId && r.fromSectionId && r.toClassId && r.toSectionId)
      .map((r) => ({ ...r, excludeStudentIds: r.excludeStudentIds }));
    const termId = resolveTermId(items, graduate);
    return {
      termId: termId ?? '',
      items,
      graduateClassIds: graduate,
      leavers: leavers.map((l) => ({ studentId: l.studentId, status: l.status, reason: l.reason.trim() || undefined })),
    };
  };

  const review = async () => {
    const b = body();
    if (b.items.length === 0 && b.graduateClassIds.length === 0 && b.leavers.length === 0) {
      toast.error('Add at least one promotion, graduation, or leaver');
      return;
    }
    if ((b.items.length > 0 || b.graduateClassIds.length > 0) && !b.termId) {
      toast.error('Could not determine the target term for this batch — check the destination class(es)');
      return;
    }
    try {
      const res = await previewPromotion(b).unwrap();
      setPreview(res.data);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not preview promotion'));
    }
  };

  const confirm = async () => {
    try {
      const res = await promote(body()).unwrap();
      toast.success(`${res.data.moved} promoted, ${res.data.graduated} graduated${res.data.left ? `, ${res.data.left} left` : ''}`);
      onPromoted(res.data);
      onClose();
      reset();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not promote'));
    }
  };

  const selectCls = 'h-9 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[520px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              {preview && (
                <button onClick={() => setPreview(null)} aria-label="Back" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ChevronLeft size={18} />
                </button>
              )}
              <h2 className="text-lg font-semibold">{preview ? 'Review promotion' : 'Promote Students'}</h2>
            </div>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          {preview ? (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <p className="text-sm text-muted-foreground">Double-check this before confirming — it moves every active student listed below right away.</p>

                {preview.structuralWarning && (
                  <div className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs text-warning">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{preview.structuralWarning}</span>
                  </div>
                )}

                {preview.items.map((it, i) => (
                  <div key={i} className="rounded-lg border border-border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {it.fromClassName} <ArrowRight size={12} className="inline text-muted-foreground" /> {it.toClassName}
                      </p>
                      {it.type === 'repeated' && <Badge variant="warning">Repeating grade</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {it.studentCount} active student{it.studentCount === 1 ? '' : 's'} will move.
                      {it.heldBackCount > 0 && ` ${it.heldBackCount} held back (repeating).`}
                    </p>
                    {it.heldBackStudents.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Repeating: {it.heldBackStudents.map((s) => `${s.name} (${s.rollNumber})`).join(', ')}
                      </p>
                    )}
                    {it.willCloneSubjects && (
                      <p className="mt-2 text-xs text-primary">{it.toClassName} has no subjects yet — they'll be copied over from {it.fromClassName} automatically.</p>
                    )}
                    {it.noSubjectsWarning && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span>Neither {it.fromClassName} nor {it.toClassName} has any subjects set up — students promoted here won't be markable for attendance or exams until you add subjects.</span>
                      </div>
                    )}
                    {it.studentsWithOutstandingBalance.length > 0 && (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning">
                        <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={12} /> {it.studentsWithOutstandingBalance.length} student(s) have unpaid fees — balance carries forward, not blocked:</p>
                        <ul className="mt-1 space-y-0.5">
                          {it.studentsWithOutstandingBalance.map((s) => (
                            <li key={s.id}>{s.name} ({s.rollNumber}) — Rs {s.balance.toLocaleString('en-PK')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {preview.graduate && (
                  <div className="rounded-lg border border-border p-3.5">
                    <p className="text-sm font-medium text-foreground">Graduating</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preview.graduate.studentCount} active student{preview.graduate.studentCount === 1 ? '' : 's'} will be marked Graduated.</p>
                    {preview.graduate.studentsWithOutstandingBalance.length > 0 && (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning">
                        <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={12} /> {preview.graduate.studentsWithOutstandingBalance.length} graduating student(s) have unpaid fees:</p>
                        <ul className="mt-1 space-y-0.5">
                          {preview.graduate.studentsWithOutstandingBalance.map((s) => (
                            <li key={s.id}>{s.name} ({s.rollNumber}) — Rs {s.balance.toLocaleString('en-PK')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {preview.leavers.length > 0 && (
                  <div className="rounded-lg border border-border p-3.5">
                    <p className="text-sm font-medium text-foreground">Leaving</p>
                    <ul className="mt-1.5 space-y-1 text-xs">
                      {preview.leavers.map((l) => (
                        <li key={l.studentId} className={l.valid ? 'text-foreground' : 'text-danger'}>
                          {l.name} ({l.rollNumber}) — <span className="capitalize">{l.status}</span>
                          {l.reason ? ` — ${l.reason}` : ''}
                          {!l.valid && ` — cannot process: ${l.issue}`}
                          {l.valid && !!l.balance && (
                            <span className="text-warning"> — owes Rs {l.balance.toLocaleString('en-PK')}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <Button type="button" variant="secondary" onClick={() => setPreview(null)}>Back</Button>
                <Button onClick={confirm} loading={promoting}>Confirm &amp; promote</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <p className="text-sm text-muted-foreground">Move active students from a section into the target term's section. Past attendance and results stay under the old class.</p>

                <div className="space-y-3">
                  {rows.map((row, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">From class</Label>
                          <select className={selectCls} value={row.fromClassId} onChange={(e) => setRow(i, { fromClassId: e.target.value, fromSectionId: '', excludeStudentIds: [] })}>
                            <option value="">Select</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.termName ?? '—'}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">From section</Label>
                          <select className={selectCls} value={row.fromSectionId} disabled={!row.fromClassId} onChange={(e) => setRow(i, { fromSectionId: e.target.value, excludeStudentIds: [] })}>
                            <option value="">Select</option>
                            {sectionsOf(row.fromClassId).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.currentCount} student{s.currentCount === 1 ? '' : 's'})</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="my-1.5 flex items-center justify-center text-muted-foreground"><ArrowRight size={14} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">To class</Label>
                          <select className={selectCls} value={row.toClassId} onChange={(e) => setRow(i, { toClassId: e.target.value, toSectionId: '' })}>
                            <option value="">Select</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.termName ?? '—'}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">To section</Label>
                          <select className={selectCls} value={row.toSectionId} disabled={!row.toClassId} onChange={(e) => setRow(i, { toSectionId: e.target.value })}>
                            <option value="">Select</option>
                            {sectionsOf(row.toClassId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <HoldBackPicker
                        classId={row.fromClassId}
                        sectionId={row.fromSectionId}
                        excluded={row.excludeStudentIds}
                        onToggle={(id) => toggleExclude(i, id)}
                      />
                      {rows.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>Remove</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setRows((r) => [...r, { fromClassId: '', fromSectionId: '', toClassId: '', toSectionId: '', excludeStudentIds: [] }])} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus size={13} /> Add another promotion
                  </button>
                </div>

                <div>
                  <Label>Graduating classes (final year)</Label>
                  <div className="space-y-1.5">
                    {classes.map((c: ClassItem) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={graduate.includes(c.id)} onChange={() => toggleGrad(c.id)} className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]" />
                        {c.name} <span className="text-muted-foreground">· {c.termName ?? '—'}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Active students in these classes will be marked Graduated.</p>
                </div>

                <div>
                  <Label>Students leaving (transferred / withdrawn / expelled)</Label>
                  <Input
                    value={leaverSearch}
                    onChange={(e) => setLeaverSearch(e.target.value)}
                    placeholder="Search by name or roll number..."
                    className="mt-1"
                  />
                  {debouncedLeaverSearch.trim().length >= 2 && searchMatches.length > 0 && (
                    <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-1.5">
                      {searchMatches.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => addLeaver(s)}
                          className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm text-foreground hover:bg-muted"
                        >
                          <span>{s.name} <span className="text-xs text-muted-foreground">· {s.rollNumber} · {s.className}{s.section ? ` ${s.section}` : ''}</span></span>
                          <Plus size={13} className="text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                  {leavers.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {leavers.map((l) => (
                        <div key={l.studentId} className="rounded-lg border border-border p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{l.name} <span className="text-xs font-normal text-muted-foreground">· {l.rollNumber}</span></p>
                            <button type="button" onClick={() => removeLeaver(l.studentId)} className="text-muted-foreground hover:text-danger"><X size={14} /></button>
                          </div>
                          <div className="mt-1.5 grid grid-cols-2 gap-2">
                            <select
                              className={selectCls}
                              value={l.status}
                              onChange={(e) => updateLeaver(l.studentId, { status: e.target.value as LeaverRow['status'] })}
                            >
                              {LEAVER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <Input
                              value={l.reason}
                              onChange={(e) => updateLeaver(l.studentId, { reason: e.target.value })}
                              placeholder="Reason (optional)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">These students are excluded from any move above and marked as having left, with the date and reason recorded.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
                <Button onClick={review} loading={previewing}>Review</Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GRADING SCHEMES TAB
   ══════════════════════════════════════════════════════════════════════════ */

const SCHEME_TYPE_INFO: { value: GradingSchemeType; title: string; description: string }[] = [
  { value: 'percentage_letter', title: 'Percentage → Letter', description: 'Classic A+/A/B/C/D/E/F bands based on a minimum percent score.' },
  { value: 'gpa', title: 'GPA', description: 'Grade-point bands (e.g. 4.0 scale) with a defined passing point.' },
  { value: 'cambridge', title: 'Cambridge', description: 'Internal predicted/mock bands (A*–U) — official grades are recorded separately per-result.' },
  { value: 'pass_fail', title: 'Pass / Fail', description: 'A single passing-percent threshold — nothing else.' },
];

const DEFAULT_PERCENTAGE_BANDS: PercentageLetterBand[] = [
  { grade: 'A+', minPercent: 90 },
  { grade: 'A', minPercent: 80 },
  { grade: 'B', minPercent: 70 },
  { grade: 'C', minPercent: 60 },
  { grade: 'D', minPercent: 50 },
  { grade: 'E', minPercent: 40 },
  { grade: 'F', minPercent: 0 },
];

const DEFAULT_GPA_POINTS: GpaGradePoint[] = [
  { grade: 'A', minPercent: 90, points: 4.0 },
  { grade: 'B', minPercent: 80, points: 3.0 },
  { grade: 'C', minPercent: 70, points: 2.0 },
  { grade: 'D', minPercent: 60, points: 1.0 },
  { grade: 'F', minPercent: 0, points: 0.0 },
];

const DEFAULT_CAMBRIDGE_BANDS: CambridgePredictedBand[] = [
  { grade: 'A*', minPercent: 90 },
  { grade: 'A', minPercent: 80 },
  { grade: 'B', minPercent: 70 },
  { grade: 'C', minPercent: 60 },
  { grade: 'D', minPercent: 50 },
  { grade: 'E', minPercent: 40 },
  { grade: 'U', minPercent: 0 },
];

function GradingSchemesTab() {
  const { data, isLoading } = useGetGradingSchemesQuery();
  const schemes = data?.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editScheme, setEditScheme] = useState<GradingScheme | null>(null);
  const [setDefault, { isLoading: settingDefault }] = useSetDefaultGradingSchemeMutation();
  const [defaultingId, setDefaultingId] = useState<string | null>(null);

  const handleSetDefault = async (id: string) => {
    setDefaultingId(id);
    try {
      await setDefault(id).unwrap();
      toast.success('Default grading scheme updated');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not set default'));
    } finally {
      setDefaultingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={16} /> Create scheme</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>
          <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((s) => (
            <Card key={s.id} className={cn('p-4', s.isDefault && 'border-primary/30')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{SCHEME_TYPE_INFO.find((t) => t.value === s.type)?.title ?? s.type}</Badge>
                    {s.isDefault && <Badge variant="primary"><Star size={11} /> Default</Badge>}
                  </div>
                </div>
                <button
                  onClick={() => setEditScheme(s)}
                  aria-label={`Edit ${s.name}`}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Repeat policy: {s.repeatPolicy === 'replace' ? 'Replace' : 'Average'}
              </p>
              {!s.isDefault && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  loading={settingDefault && defaultingId === s.id}
                  onClick={() => handleSetDefault(s.id)}
                >
                  <Star size={13} /> Set as default
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <GradingSchemeCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <GradingSchemeEditSheet scheme={editScheme} open={!!editScheme} onClose={() => setEditScheme(null)} />
    </div>
  );
}

function seedConfigFor(type: GradingSchemeType): GradingSchemeConfig {
  switch (type) {
    case 'percentage_letter':
      return { bands: DEFAULT_PERCENTAGE_BANDS.map((b) => ({ ...b })) };
    case 'gpa':
      return { gradePoints: DEFAULT_GPA_POINTS.map((b) => ({ ...b })), passingGradePoints: 1.0 };
    case 'cambridge':
      return { predictedBands: DEFAULT_CAMBRIDGE_BANDS.map((b) => ({ ...b })) };
    case 'pass_fail':
      return { passingPercent: 50 };
  }
}

function RepeatPolicySelector({ value, onChange }: { value: RepeatPolicy; onChange: (v: RepeatPolicy) => void }) {
  return (
    <div>
      <Label>Repeat policy</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(['replace', 'average'] as RepeatPolicy[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'rounded-lg border p-3 text-left text-sm transition-all',
              value === opt ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-foreground hover:bg-muted'
            )}
          >
            <span className="font-medium capitalize">{opt}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {opt === 'replace'
                ? 'A repeated result replaces the previous attempt entirely.'
                : 'A repeated result is averaged together with the previous attempt.'}
            </p>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Mainly relevant for GPA schemes, but applies to any type.</p>
    </div>
  );
}

function PercentageLetterEditor({ bands, onChange }: { bands: PercentageLetterBand[]; onChange: (b: PercentageLetterBand[]) => void }) {
  const update = (i: number, patch: Partial<PercentageLetterBand>) => onChange(bands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(bands.filter((_, idx) => idx !== i));
  const add = () => onChange([...bands, { grade: '', minPercent: 0 }]);
  return (
    <div>
      <Label>Grade bands</Label>
      <div className="space-y-2">
        {bands.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={b.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="Grade" className="w-24" />
            <Input type="number" value={b.minPercent} onChange={(e) => update(i, { minPercent: Number(e.target.value) })} placeholder="Min %" className="flex-1" />
            <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus size={13} /> Add band</button>
    </div>
  );
}

function GpaEditor({
  gradePoints, passingGradePoints, onChangePoints, onChangePassing,
}: {
  gradePoints: GpaGradePoint[];
  passingGradePoints: number;
  onChangePoints: (g: GpaGradePoint[]) => void;
  onChangePassing: (v: number) => void;
}) {
  const update = (i: number, patch: Partial<GpaGradePoint>) => onChangePoints(gradePoints.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const remove = (i: number) => onChangePoints(gradePoints.filter((_, idx) => idx !== i));
  const add = () => onChangePoints([...gradePoints, { grade: '', minPercent: 0, points: 0 }]);
  return (
    <div className="space-y-4">
      <div>
        <Label>Grade points</Label>
        <div className="space-y-2">
          {gradePoints.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={g.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="Grade" className="w-20" />
              <Input type="number" value={g.minPercent} onChange={(e) => update(i, { minPercent: Number(e.target.value) })} placeholder="Min %" className="flex-1" />
              <Input type="number" step="0.1" value={g.points} onChange={(e) => update(i, { points: Number(e.target.value) })} placeholder="Points" className="flex-1" />
              <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={add} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus size={13} /> Add row</button>
      </div>
      <div>
        <Label htmlFor="passing-gpa">Passing grade points</Label>
        <Input id="passing-gpa" type="number" step="0.1" value={passingGradePoints} onChange={(e) => onChangePassing(Number(e.target.value))} />
      </div>
    </div>
  );
}

function CambridgeEditor({ bands, onChange }: { bands: CambridgePredictedBand[]; onChange: (b: CambridgePredictedBand[]) => void }) {
  const update = (i: number, patch: Partial<CambridgePredictedBand>) => onChange(bands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(bands.filter((_, idx) => idx !== i));
  const add = () => onChange([...bands, { grade: '', minPercent: 0 }]);
  return (
    <div>
      <div className="mb-2 flex items-start gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 py-2 text-xs text-primary-soft-foreground">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>These bands are for an internal predicted/mock grade only. The official Cambridge grade gets recorded separately per-result once issued.</span>
      </div>
      <Label>Predicted grade bands</Label>
      <div className="space-y-2">
        {bands.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={b.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="Grade" className="w-24" />
            <Input type="number" value={b.minPercent} onChange={(e) => update(i, { minPercent: Number(e.target.value) })} placeholder="Min %" className="flex-1" />
            <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus size={13} /> Add band</button>
    </div>
  );
}

function PassFailEditor({ passingPercent, onChange }: { passingPercent: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label htmlFor="passing-percent">Passing percent</Label>
      <Input id="passing-percent" type="number" value={passingPercent} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function ConfigEditor({ type, config, onChange }: { type: GradingSchemeType; config: GradingSchemeConfig; onChange: (c: GradingSchemeConfig) => void }) {
  switch (type) {
    case 'percentage_letter':
      return <PercentageLetterEditor bands={config.bands ?? []} onChange={(bands) => onChange({ ...config, bands })} />;
    case 'gpa':
      return (
        <GpaEditor
          gradePoints={config.gradePoints ?? []}
          passingGradePoints={config.passingGradePoints ?? 0}
          onChangePoints={(gradePoints) => onChange({ ...config, gradePoints })}
          onChangePassing={(passingGradePoints) => onChange({ ...config, passingGradePoints })}
        />
      );
    case 'cambridge':
      return <CambridgeEditor bands={config.predictedBands ?? []} onChange={(predictedBands) => onChange({ ...config, predictedBands })} />;
    case 'pass_fail':
      return <PassFailEditor passingPercent={config.passingPercent ?? 0} onChange={(passingPercent) => onChange({ ...config, passingPercent })} />;
  }
}

function GradingSchemeCreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createScheme, { isLoading }] = useCreateGradingSchemeMutation();
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [type, setType] = useState<GradingSchemeType>('percentage_letter');
  const [name, setName] = useState('');
  const [repeatPolicy, setRepeatPolicy] = useState<RepeatPolicy>('replace');
  const [config, setConfig] = useState<GradingSchemeConfig>(seedConfigFor('percentage_letter'));

  useEffect(() => {
    if (!open) return;
    setStep('type');
    setType('percentage_letter');
    setName('');
    setRepeatPolicy('replace');
    setConfig(seedConfigFor('percentage_letter'));
  }, [open]);

  const pickType = (t: GradingSchemeType) => {
    setType(t);
    setConfig(seedConfigFor(t));
    setStep('config');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      await createScheme({ name: name.trim(), type, repeatPolicy, config }).unwrap();
      toast.success('Grading scheme created');
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Could not create grading scheme'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              {step === 'config' && (
                <button onClick={() => setStep('type')} aria-label="Back" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ChevronLeft size={18} />
                </button>
              )}
              <h2 className="text-lg font-semibold">Create grading scheme</h2>
            </div>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          {step === 'type' ? (
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              <p className="text-sm text-muted-foreground">
                Choose the grading type first — this can't be changed after creation, so pick carefully. You can always create another scheme later if you need a different type.
              </p>
              {SCHEME_TYPE_INFO.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => pickType(t.value)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border p-3.5 text-left transition-all hover:border-primary hover:bg-primary-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  <ArrowRight size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div>
                  <Label htmlFor="scheme-name">Name</Label>
                  <Input id="scheme-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High School Grading" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{SCHEME_TYPE_INFO.find((t) => t.value === type)?.title}</Badge>
                  <span className="text-xs text-muted-foreground">Type selected — go back to change it.</span>
                </div>
                <ConfigEditor type={type} config={config} onChange={setConfig} />
                <RepeatPolicySelector value={repeatPolicy} onChange={setRepeatPolicy} />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
                <Button type="submit" loading={isLoading}>Create</Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GradingSchemeEditSheet({ scheme, open, onClose }: { scheme: GradingScheme | null; open: boolean; onClose: () => void }) {
  const [updateScheme, { isLoading }] = useUpdateGradingSchemeMutation();
  const [name, setName] = useState('');
  const [repeatPolicy, setRepeatPolicy] = useState<RepeatPolicy>('replace');
  const [config, setConfig] = useState<GradingSchemeConfig>({});

  useEffect(() => {
    if (open && scheme) {
      setName(scheme.name);
      setRepeatPolicy(scheme.repeatPolicy);
      setConfig(scheme.config);
    }
  }, [open, scheme]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheme) return;
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      await updateScheme({ id: scheme.id, body: { name: name.trim(), repeatPolicy, config } }).unwrap();
      toast.success('Grading scheme updated');
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Could not update grading scheme'));
    }
  };

  if (!scheme) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={submit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Edit grading scheme</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="edit-scheme-name">Name</Label>
              <Input id="edit-scheme-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{SCHEME_TYPE_INFO.find((t) => t.value === scheme.type)?.title ?? scheme.type}</Badge>
                <Lock size={12} className="text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Scheme type can't be changed after creation — create a new scheme if you need a different type.</p>
            </div>
            <ConfigEditor type={scheme.type} config={config} onChange={setConfig} />
            <RepeatPolicySelector value={repeatPolicy} onChange={setRepeatPolicy} />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Save changes</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
