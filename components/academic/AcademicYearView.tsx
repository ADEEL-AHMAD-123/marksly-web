'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarRange, Plus, ArrowRight, X, GraduationCap, AlertTriangle, Undo2, ChevronLeft,
  Pencil, Lock, Star, Info, Trash2, Award,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoNote } from '@/components/ui/info-note';
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
  // Deep-linkable via ?tab=grading (e.g. from ResultsEntry's "set up a
  // grading scheme" link when no scheme is configured) — read via
  // window.location.search instead of useSearchParams to avoid that hook's
  // Suspense-boundary requirement, same pattern as SettingsView's tab param.
  const [tab, setTab] = useState('terms');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'grading') setTab('grading');
  }, []);

  // Primary actions live in the header's actions slot, same as Students/
  // Staff (Add Student, Bulk import, etc. all sit in PageHeader there) —
  // this used to be a floating button row inside each tab's own content,
  // which looked like a different page's conventions from the rest of the
  // admin. Lifted up here (rather than left inside TermsTab/
  // GradingSchemesTab) so the header can show the right buttons for
  // whichever tab is active; the sheets/drawers themselves still render
  // inside each tab, just driven by state passed down instead of owned
  // there.
  const [termCreateOpen, setTermCreateOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [schemeCreateOpen, setSchemeCreateOpen] = useState(false);

  // Deliberately NOT terminology.termPlural here (which would say e.g.
  // "Academic Years" for a yearly-structured institution) — that label only
  // makes sense if every term is the same type, but this page's own Add
  // Term form lets an admin freely mix academic years, semesters, and short
  // sessions side by side (see STRUCTURE_DEFAULT_TERM_TYPE — it's only a
  // *default* for the create form, never a lock). A school running both a
  // yearly track and a short course, say, would see a page literally
  // labeled "Academic Years" that also lists their short sessions — a
  // mismatch between the label and what's actually on the page. "Academic
  // Terms" covers every term type without implying only one exists, and
  // matches this page's own <title> (see admin/academic-year/page.tsx).
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Terms & Grading"
        description="Manage academic years, semesters and sessions, promote students, and configure grading schemes."
        actions={
          tab === 'terms' ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button variant="secondary" size="sm" onClick={() => setPromoteOpen(true)}>
                <GraduationCap size={16} /> Promote students
              </Button>
              <Button size="sm" onClick={() => setTermCreateOpen(true)}>
                <Plus size={16} /> Add term
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setSchemeCreateOpen(true)}>
              <Plus size={16} /> Create scheme
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto gap-1.5 bg-transparent p-0">
          <TabsTrigger
            value="terms"
            className="gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary/30 data-[state=active]:bg-primary-soft data-[state=active]:text-primary-soft-foreground"
          >
            <CalendarRange size={16} /> Academic Terms
          </TabsTrigger>
          <TabsTrigger
            value="grading"
            className="gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary/30 data-[state=active]:bg-primary-soft data-[state=active]:text-primary-soft-foreground"
          >
            <Award size={16} /> Grading Schemes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="terms">
          <TermsTab
            createOpen={termCreateOpen}
            onCreateClose={() => setTermCreateOpen(false)}
            onOpenCreate={() => setTermCreateOpen(true)}
            promoteOpen={promoteOpen}
            onPromoteClose={() => setPromoteOpen(false)}
          />
        </TabsContent>
        <TabsContent value="grading">
          <GradingSchemesTab
            createOpen={schemeCreateOpen}
            onCreateClose={() => setSchemeCreateOpen(false)}
            onOpenCreate={() => setSchemeCreateOpen(true)}
          />
        </TabsContent>
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

function TermsTab({
  createOpen, onCreateClose, onOpenCreate, promoteOpen, onPromoteClose,
}: {
  createOpen: boolean;
  onCreateClose: () => void;
  onOpenCreate: () => void;
  promoteOpen: boolean;
  onPromoteClose: () => void;
}) {
  const terminology = useTerminology();
  const { data, isLoading } = useGetTermsQuery();
  const terms = data?.data ?? [];
  const [editTerm, setEditTerm] = useState<Term | null>(null);
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
      {/* Low-key, not a required pre-step — the wording/default term type
          is already auto-set from the institution type chosen at
          registration, so most admins never need to touch this. This is
          just a "psst, in case it guessed wrong" pointer, shown only while
          it's still changeable (before the first term locks it in). */}
      {terms.length === 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
          <Info size={17} className="mt-0.5 shrink-0" />
          <span>
            Using different wording — like &quot;Course&quot; instead of &quot;Class&quot;? That comes from your{' '}
            <Link href="/admin/settings?tab=institution" className="font-medium text-primary underline underline-offset-2">
              Academic Structure
            </Link>{' '}
            setting, which locks once you create your first term below.
          </span>
        </div>
      )}

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
        // Mirrors the real term card's shape (title bar, badge row, date
        // line) rather than a generic block, so the loading → loaded swap
        // doesn't visibly shape-shift — same idea as ClassesView's skeleton
        // grid, adapted to this card's own layout.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
              </div>
              <Skeleton className="mt-2.5 h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarRange}
            title={`No ${terminology.termPlural.toLowerCase()} yet`}
            description={`Create your first ${terminology.term.toLowerCase()} to start building ${terminology.classUnitPlural.toLowerCase()} and enrolling students.`}
            action={<Button size="sm" onClick={onOpenCreate}><Plus size={16} /> Add {terminology.term.toLowerCase()}</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <TermGroup label="Active" terms={groups.active} allTerms={terms} onEdit={setEditTerm} emphasize />
          <TermGroup label="Upcoming" terms={groups.upcoming} allTerms={terms} onEdit={setEditTerm} />
          <TermGroup label="Closed" terms={groups.closed} allTerms={terms} onEdit={setEditTerm} />
        </div>
      )}

      {/* Help — placed after the actual tool, same pattern as the ID Cards
          page's own bottom InfoNotes, not before it. Answers the three
          things worth knowing before touching this tab: what a term
          actually is, what closing one does (and how fast), and the one
          promotion gotcha that's easy to miss until it's already happened. */}
      <div className="space-y-2">
        <InfoNote title="What counts as a term?">
          <p>
            A term is the time window everything else hangs off of — every {terminology.classUnit.toLowerCase()}, every
            enrollment, and every recorded result belongs to exactly one. <strong>Academic Year</strong>,{' '}
            <strong>Semester</strong>, <strong>Trimester</strong> and <strong>Short Session</strong> are just different
            shapes of the same thing — you can mix them freely (say, a yearly track alongside one short course), and
            group semesters under a shared academic year purely for reporting, without changing anything about how
            they behave.
          </p>
        </InfoNote>
        <InfoNote title="What happens when I close a term, and how fast?">
          <p>
            Closing takes effect immediately: you can no longer create a new {terminology.classUnit.toLowerCase()} under
            a closed term, or reactivate one that was marked inactive under it. Nothing already recorded — attendance,
            results, enrollment history — is touched, hidden, or recalculated; closing only stops new activity from
            being added under it going forward.
          </p>
        </InfoNote>
        <InfoNote
          title="Before you promote students, check the target class has subjects"
          link={{ href: '/admin/subjects', label: 'Go to Subjects' }}
        >
          <p>
            When you promote students, we automatically move their subjects along too — <strong>if the class they&apos;re
            moving to has no subjects of its own yet, we copy over the ones from their old class</strong> so nothing
            is missing.
          </p>
          <p>
            But if <strong>neither the old nor the new class has any subjects set up</strong>, there&apos;s nothing to
            copy — students land in the new class with no subjects at all, which means you won&apos;t be able to mark
            their attendance or record exam results there until you add subjects yourself. The promotion screen
            warns you about this before you confirm, so check that warning carefully.
          </p>
        </InfoNote>
      </div>

      <TermFormSheet mode="create" open={createOpen} onClose={onCreateClose} />
      <TermFormSheet mode="edit" term={editTerm} open={!!editTerm} onClose={() => setEditTerm(null)} />
      <PromoteDrawer
        open={promoteOpen}
        onClose={onPromoteClose}
        onPromoted={(res) => setLastBatch(res)}
      />
    </div>
  );
}

function TermGroup({
  label, terms, allTerms, onEdit, emphasize,
}: {
  label: string;
  terms: Term[];
  // The full unfiltered term list (not just this status group) — needed to
  // resolve a term's parentAcademicYearId into a displayable name, since
  // the parent year could be sitting in a different status bucket (e.g. an
  // upcoming semester grouped under an already-closed academic year).
  allTerms: Term[];
  onEdit: (t: Term) => void;
  emphasize?: boolean;
}) {
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
            {t.parentAcademicYearId && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Part of {allTerms.find((y) => y.id === t.parentAcademicYearId)?.name ?? 'an academic year'}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// The API returns startDate/endDate as full ISO datetimes (e.g.
// "2026-09-01T00:00:00.000Z"), but a native <input type="date"> only
// accepts the exact "YYYY-MM-DD" shape — anything else and the browser
// silently renders the field as empty rather than erroring. That's exactly
// what was happening here: opening Edit looked like the dates had been
// wiped, when really they were just in a format the date input couldn't
// display, forcing an admin to re-type dates that were never actually lost
// (until they did, by saving over the blank-looking field).
function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
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

  // Same cache entry the term list screen already populated — this doesn't
  // trigger a second network request, just reads the shared RTK Query cache.
  const { data: termsData } = useGetTermsQuery();
  const allTerms = termsData?.data ?? [];
  // Only a term of type `academic_year` is a valid parent (see
  // term.service.ts's assertValidParentAcademicYear()) — filtering the
  // dropdown to just those means the user can never even select an invalid
  // one, instead of picking something and finding out from an error after
  // submitting. A term also can't be its own parent.
  const eligibleParentYears = allTerms.filter((t) => t.type === 'academic_year' && t.id !== term?.id);

  const [name, setName] = useState('');
  const [type, setType] = useState<TermType>(defaultType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TermStatus>('upcoming');
  const [parentAcademicYearId, setParentAcademicYearId] = useState<string>('');
  const [typeLockedError, setTypeLockedError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && term) {
      setName(term.name);
      setType(term.type);
      setStartDate(toDateInputValue(term.startDate));
      setEndDate(toDateInputValue(term.endDate));
      setStatus(term.status);
      setParentAcademicYearId(term.parentAcademicYearId ?? '');
    } else {
      setName('');
      setType(defaultType);
      setStartDate('');
      setEndDate('');
      setStatus('upcoming');
      setParentAcademicYearId('');
    }
    setTypeLockedError(null);
    // `structure` (and therefore defaultType) is included so that if
    // useGetMyInstitutionQuery is still loading when the create sheet first
    // opens, the form reseeds with the real default type once it arrives —
    // but only while freshly opened in create mode, since this whole branch
    // is skipped once `open` is false, so it won't clobber a value the user
    // has already actively changed mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, term?.id, structure]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    // Same rule the backend now enforces (see term.validator.ts) — checked
    // here too so the user sees it instantly instead of after a round trip.
    if (startDate && endDate && endDate < startDate) {
      toast.error('End date cannot be before start date');
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
          parentAcademicYearId: parentAcademicYearId || undefined,
        }).unwrap();
        toast.success('Term created');
      } else if (term) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status,
          // `null` (not omitted) so choosing "No parent" actually clears an
          // existing link — omitting the key means "leave unchanged" (see
          // UpdateTermBody's own comment).
          parentAcademicYearId: parentAcademicYearId || null,
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
              <Select value={type} onValueChange={(v) => setType(v as TermType)}>
                <SelectTrigger id="term-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TERM_TYPE_LABEL) as TermType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TERM_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Individual terms can deviate from your institution's usual structure if needed (e.g. one short session inside an otherwise yearly setup).
              </p>
              {typeLockedError && (
                <p className="mt-1.5 flex items-start gap-1 text-xs text-danger">
                  <Lock size={12} className="mt-0.5 shrink-0" /> {typeLockedError}
                </p>
              )}
            </div>
            {/* Only meaningful for a term that ISN'T itself an academic
                year — e.g. grouping Fall 2026 + Spring 2027 (both
                `semester`) under a shared "AY 2026-27" for reporting
                rollups. An academic_year term having its own parent year
                is a confusing concept the backend allows but this UI
                doesn't need to offer. */}
            {type !== 'academic_year' && (
              <div>
                <Label htmlFor="term-parent-year">Part of academic year (optional)</Label>
                {eligibleParentYears.length > 0 ? (
                  // Radix Select can't have an item with an empty-string
                  // value, so "no parent" uses a 'none' sentinel translated
                  // back to '' at the state boundary right below — the rest
                  // of the component still just deals in the plain empty
                  // string it always did.
                  <Select
                    value={parentAcademicYearId || 'none'}
                    onValueChange={(v) => setParentAcademicYearId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="term-parent-year"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent academic year</SelectItem>
                      {eligibleParentYears.map((y) => (
                        <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    No academic-year terms exist yet to group this under — create one first if you want reports to roll this term up under a shared year.
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Groups this term under a full academic year for reporting — doesn't change dates, status, or promotion behavior.
                </p>
              </div>
            )}
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
              <Select value={status} onValueChange={(v) => setStatus(v as TermStatus)}>
                <SelectTrigger id="term-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
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
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Move students between sections</h3>
                  <p className="mb-3 text-xs text-muted-foreground">Active students move from a section into the target term's section. Past attendance and results stay under the old class.</p>
                </div>

                <div className="space-y-3">
                  {rows.map((row, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">From class</Label>
                          <Select value={row.fromClassId} onValueChange={(v) => setRow(i, { fromClassId: v, fromSectionId: '', excludeStudentIds: [] })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.termName ?? '—'}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">From section</Label>
                          <Select value={row.fromSectionId} disabled={!row.fromClassId} onValueChange={(v) => setRow(i, { fromSectionId: v, excludeStudentIds: [] })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {sectionsOf(row.fromClassId).map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.currentCount} student{s.currentCount === 1 ? '' : 's'})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="my-1.5 flex items-center justify-center text-muted-foreground"><ArrowRight size={14} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">To class</Label>
                          <Select value={row.toClassId} onValueChange={(v) => setRow(i, { toClassId: v, toSectionId: '' })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.termName ?? '—'}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">To section</Label>
                          <Select value={row.toSectionId} disabled={!row.toClassId} onValueChange={(v) => setRow(i, { toSectionId: v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {sectionsOf(row.toClassId).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
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

                <div className="border-t border-border pt-5">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Graduating classes (final year)</h3>
                  <div className="space-y-1.5 rounded-lg border border-border p-3">
                    {classes.map((c: ClassItem) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={graduate.includes(c.id)} onChange={() => toggleGrad(c.id)} className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]" />
                        {c.name} <span className="text-muted-foreground">· {c.termName ?? '—'}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Active students in these classes will be marked Graduated.</p>
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Students leaving (transferred / withdrawn / expelled)</h3>
                  <Input
                    value={leaverSearch}
                    onChange={(e) => setLeaverSearch(e.target.value)}
                    placeholder="Search by name or roll number..."
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
                            <Select value={l.status} onValueChange={(v) => updateLeaver(l.studentId, { status: v as LeaverRow['status'] })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LEAVER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
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

function GradingSchemesTab({
  createOpen, onCreateClose, onOpenCreate,
}: {
  createOpen: boolean;
  onCreateClose: () => void;
  onOpenCreate: () => void;
}) {
  const { data, isLoading } = useGetGradingSchemesQuery();
  const schemes = data?.data ?? [];
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
      {isLoading ? (
        // Mirrors the real scheme card's shape (title bar, type badge, repeat
        // policy line) for the same reason as the Terms skeleton above.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
              </div>
              <Skeleton className="mt-2.5 h-3 w-2/5" />
            </Card>
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Award}
            title="No grading schemes yet"
            description="Create one to define how raw scores turn into grades on report cards and results."
            action={<Button size="sm" onClick={onOpenCreate}><Plus size={16} /> Create scheme</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((s) => (
            <Card
              key={s.id}
              className={cn(
                'relative p-4',
                // "Default" is a distinct kind of highlight from a term's
                // "Active" status (see TermGroup below, which keeps the plain
                // border-primary/30 treatment) — this reuses the accent
                // corner-ribbon vocabulary from PricingPlans' "Most popular"
                // badge so the two featured states read as different things,
                // not the same emphasis applied twice.
                s.isDefault && 'border-accent/40 shadow-sm ring-1 ring-accent/20'
              )}
            >
              {s.isDefault && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground shadow">
                  Default
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{SCHEME_TYPE_INFO.find((t) => t.value === s.type)?.title ?? s.type}</Badge>
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
              {/* Only shown for GPA schemes — the only type this setting
                  actually affects (see grading-scheme.model.ts's comment on
                  repeatPolicy). Showing it on every scheme regardless of
                  type was exactly what made this confusing: it looked like
                  a real setting on a percentage/Cambridge/pass-fail scheme
                  too, when it's silently ignored there. */}
              {s.type === 'gpa' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Retaken course: {s.repeatPolicy === 'replace' ? 'replaces old CGPA grade' : 'averaged with old CGPA grade'}
                </p>
              )}
              {!s.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 -ml-2 text-muted-foreground hover:text-foreground"
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

      {/* Help — same bottom placement as the Terms tab and the ID Cards
          page: what a scheme actually is, which one applies where, and —
          the thing that trips people up most — whether editing one
          reaches back and changes grades that are already out. */}
      <div className="space-y-2">
        <InfoNote title="What is a grading scheme?">
          <p>
            A grading scheme is the rule that turns a raw percentage score into what actually shows up on a report
            card or result — a letter (A/B/C…), a GPA grade point, a Cambridge predicted band, or a plain pass/fail.
            Every class uses one: either a scheme assigned to it directly, or your institution&apos;s{' '}
            <strong>default</strong> scheme if none is assigned.
          </p>
        </InfoNote>
        <InfoNote title="If I edit a scheme's bands, does it change grades that are already recorded?">
          <p>
            No — a grade is calculated and stored the moment a result is entered, using whichever scheme applied to
            that class at that time. Editing a scheme&apos;s bands afterward only affects results entered or
            re-saved <strong>from that point on</strong>; anything already recorded (and any report card already
            issued) keeps the grade it was given, even after the bands change. This is deliberate — changing a
            cutoff after report cards are out won&apos;t silently rewrite history.
          </p>
        </InfoNote>
        <InfoNote title="Can I change a scheme's type later?">
          <p>
            No — a scheme&apos;s type (percentage/letter, GPA, Cambridge, pass/fail) is locked in at creation, so
            create a new scheme instead if you need a different one. The same lock applies per class: one that
            already has recorded results can&apos;t be switched to a scheme of a different type — assign the new
            scheme to a fresh class/term instead if the assessment structure itself needs to change.
          </p>
        </InfoNote>
      </div>

      <GradingSchemeCreateSheet open={createOpen} onClose={onCreateClose} />
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

// Only meaningful for GPA schemes — see grading-scheme.model.ts's comment
// on repeatPolicy. Non-GPA schemes (percentage/letter, Cambridge, pass/fail)
// silently ignore this setting entirely, so both forms below only render
// this selector once `type === 'gpa'`, instead of showing a control that
// looks like it does something on every scheme type when it only actually
// affects one.
function RepeatPolicySelector({ value, onChange }: { value: RepeatPolicy; onChange: (v: RepeatPolicy) => void }) {
  return (
    <div>
      <Label>If a student retakes a failed/repeated course</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">How the new attempt's grade points fold into their CGPA.</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <span className="font-medium">{opt === 'replace' ? 'Replace old grade' : 'Average both attempts'}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {opt === 'replace'
                ? "Only the new attempt's grade points count — as if the failed try never happened."
                : "The old and new attempts' grade points are averaged together."}
            </p>
          </button>
        ))}
      </div>
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
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 sm:contents">
              <Input value={b.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="Grade" className="w-24" />
              <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger sm:order-last"><Trash2 size={14} /></button>
            </div>
            <Input type="number" value={b.minPercent} onChange={(e) => update(i, { minPercent: Number(e.target.value) })} placeholder="Min %" className="w-full sm:flex-1" />
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
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 sm:contents">
                <Input value={g.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="Grade" className="w-20" />
                <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger sm:order-last"><Trash2 size={14} /></button>
              </div>
              <div className="flex flex-col gap-2 sm:contents">
                <Input type="number" value={g.minPercent} onChange={(e) => update(i, { minPercent: Number(e.target.value) })} placeholder="Min %" className="w-full sm:flex-1" />
                <Input type="number" step="0.1" value={g.points} onChange={(e) => update(i, { points: Number(e.target.value) })} placeholder="Points" className="w-full sm:flex-1" />
              </div>
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
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 sm:contents">
              <Input value={b.grade} onChange={(e) => update(i, { grade: e.target.value })} placeholder="Grade" className="w-24" />
              <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger sm:order-last"><Trash2 size={14} /></button>
            </div>
            <Input type="number" value={b.minPercent} onChange={(e) => update(i, { minPercent: Number(e.target.value) })} placeholder="Min %" className="w-full sm:flex-1" />
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

// Validates that a scheme's config isn't obviously broken before it's ever
// sent to the backend. Returns an error message to show inline, or null if
// the config is valid. `pass_fail` only needs its passingPercent bound
// checked; the band-based types (percentage_letter/gpa/cambridge) all need
// at least one row, a 0%-floor band, and unique grades.
function validateSchemeConfig(type: GradingSchemeType, config: GradingSchemeConfig): string | null {
  if (type === 'pass_fail') {
    const p = config.passingPercent;
    if (p === undefined || p === null || Number.isNaN(p) || p < 0 || p > 100) {
      return 'Passing percent must be between 0 and 100.';
    }
    return null;
  }

  const rows: { grade: string; minPercent: number }[] =
    type === 'percentage_letter' ? (config.bands ?? [])
    : type === 'gpa' ? (config.gradePoints ?? [])
    : type === 'cambridge' ? (config.predictedBands ?? [])
    : [];

  if (rows.length === 0) {
    return 'Add at least one grade band.';
  }
  if (!rows.some((r) => r.minPercent === 0)) {
    return 'Add a band starting at 0% so every score has a grade.';
  }
  const grades = rows.map((r) => r.grade.trim()).filter((g) => g !== '');
  if (grades.length !== rows.length) {
    return 'Every band needs a grade label.';
  }
  const uniqueGrades = new Set(grades);
  if (uniqueGrades.size !== grades.length) {
    return 'Each grade must be unique within this scheme.';
  }
  return null;
}

function GradingSchemeCreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createScheme, { isLoading }] = useCreateGradingSchemeMutation();
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [type, setType] = useState<GradingSchemeType>('percentage_letter');
  const [name, setName] = useState('');
  const [repeatPolicy, setRepeatPolicy] = useState<RepeatPolicy>('replace');
  const [config, setConfig] = useState<GradingSchemeConfig>(seedConfigFor('percentage_letter'));
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('type');
    setType('percentage_letter');
    setName('');
    setRepeatPolicy('replace');
    setConfig(seedConfigFor('percentage_letter'));
    setConfigError(null);
  }, [open]);

  const pickType = (t: GradingSchemeType) => {
    setType(t);
    setConfig(seedConfigFor(t));
    setConfigError(null);
    setStep('config');
  };

  const handleConfigChange = (c: GradingSchemeConfig) => {
    setConfig(c);
    setConfigError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const err = validateSchemeConfig(type, config);
    if (err) {
      setConfigError(err);
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
                <ConfigEditor type={type} config={config} onChange={handleConfigChange} />
                {configError && <p className="text-xs text-danger">{configError}</p>}
                {type === 'gpa' && <RepeatPolicySelector value={repeatPolicy} onChange={setRepeatPolicy} />}
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
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (open && scheme) {
      setName(scheme.name);
      setRepeatPolicy(scheme.repeatPolicy);
      setConfig(scheme.config);
      setConfigError(null);
    }
  }, [open, scheme]);

  const handleConfigChange = (c: GradingSchemeConfig) => {
    setConfig(c);
    setConfigError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheme) return;
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const err = validateSchemeConfig(scheme.type, config);
    if (err) {
      setConfigError(err);
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
            <ConfigEditor type={scheme.type} config={config} onChange={handleConfigChange} />
            {configError && <p className="text-xs text-danger">{configError}</p>}
            {scheme.type === 'gpa' && <RepeatPolicySelector value={repeatPolicy} onChange={setRepeatPolicy} />}
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
