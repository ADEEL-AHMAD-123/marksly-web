'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, X, FileText, ClipboardList, Laptop, Eye, Loader2, AlertCircle,
  Check, ChevronRight, ChevronLeft, ListChecks, Settings2, Pencil,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SearchInput } from '@/components/ui/search-input';
import { getErrorMessage } from '@/lib/get-error-message';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoNote } from '@/components/ui/info-note';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import { useGetClassesQuery } from '@/store/api/classesApi';
import {
  useGetExamsQuery, useCreateExamMutation, useDeleteExamMutation, usePreviewExamQuery,
  useGetExamForEditQuery, useUpdateExamMutation,
  type ExamType, type ExamMode, type IntegrityMode, type ExamQuestion, type QuestionType,
} from '@/store/api/examsApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import { formatDate } from '@/lib/utils';
import { useTerminology } from '@/lib/terminology';
import { ResultsEntry } from './ResultsEntry';
import { ExamMonitoringView } from './ExamMonitoringView';

const TYPES: { value: ExamType; label: string }[] = [
  { value: 'midterm', label: 'Mid-term' },
  { value: 'final', label: 'Final' },
  { value: 'unit', label: 'Unit test' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'board', label: 'Board' },
];

const MODES: { value: ExamMode; label: string; hint: string }[] = [
  { value: 'physical', label: 'Written exam', hint: 'Paper test — enter marks manually afterwards' },
  { value: 'online', label: 'Online quiz / test', hint: 'Students take it in the app, auto-graded' },
  { value: 'oral', label: 'Oral', hint: 'Viva / spoken assessment' },
  { value: 'practical', label: 'Practical', hint: 'Lab / hands-on assessment' },
  { value: 'project', label: 'Project', hint: 'Submitted work, graded manually' },
  { value: 'assignment', label: 'Assignment', hint: 'Take-home work, graded manually' },
];

const INTEGRITY_MODES: { value: IntegrityMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'flag_only', label: 'Flag only' },
  { value: 'fullscreen_lock', label: 'Fullscreen lock' },
];

// Below this many exams, scanning the whole grid works fine and a search
// box is more friction than help — same threshold/reasoning as
// AdminDashboardAttendance's/Subjects' own SEARCH_THRESHOLD.
const EXAM_SEARCH_THRESHOLD = 9;
const EXAM_PAGE_SIZE = 12;

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq_single', label: 'Multiple choice (1 answer)' },
  { value: 'mcq_multi', label: 'Multiple choice (multi)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'fill_blank', label: 'Fill in the blank' },
  { value: 'numeric', label: 'Numeric' },
];

function ModeBadge({ mode }: { mode: ExamMode }) {
  if (mode === 'online') return <Badge variant="primary">Online</Badge>;
  const label = MODES.find((m) => m.value === mode)?.label ?? mode;
  return <Badge variant="outline" className="capitalize">{label}</Badge>;
}

export function ExamsView({ title = 'Exams' }: { title?: string }) {
  const { user } = useAppSelector((state) => state.auth);
  // Exam creation/grading/publishing is teacher-only — the person actually
  // setting and running the test. Admin keeps a read-only view (results,
  // attempts, analysis) for oversight/reporting; see exam.routes.ts's
  // canRead/canWrite split.
  const isTeacher = user?.role === 'teacher';

  const [termId, setTermId] = useState('all');
  const { data, isLoading } = useGetExamsQuery({ termId: termId === 'all' ? undefined : termId });
  const allExams = data?.data ?? [];
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const q = query.trim().toLowerCase();
  const exams = q
    ? allExams.filter((e) => [e.title, e.className].some((v) => (v ?? '').toLowerCase().includes(q)))
    : allExams;
  const showSearch = allExams.length > EXAM_SEARCH_THRESHOLD;
  const totalPages = Math.max(1, Math.ceil(exams.length / EXAM_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedExams = exams.slice((pageSafe - 1) * EXAM_PAGE_SIZE, pageSafe * EXAM_PAGE_SIZE);
  const { data: termsRes } = useGetTermsQuery();
  const terms = termsRes?.data ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [activeExam, setActiveExam] = useState<string | null>(null);
  const [monitoringExam, setMonitoringExam] = useState<string | null>(null);
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [deleteExam, { isLoading: deleting }] = useDeleteExamMutation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExam(deleteTarget.id).unwrap();
      toast.success('Exam deleted');
      setDeleteTarget(null);
    } catch (e) {
      // Backend refuses once the exam has any recorded result, completed
      // attempt, or a student mid-attempt (exam.service.ts's
      // assertNoRecordedHistory/assertNoActiveAttempts) -- surface that
      // reason directly rather than a generic failure, since it's actually
      // informative ("has recorded results", "student in progress").
      toast.error(getErrorMessage(e, 'Could not delete this exam'));
    }
  };

  // Dashboard nudges ("needs grading", "awaiting publish", etc.) link here
  // with ?examId=... promising to land the teacher straight on that exam --
  // honor it once the list has loaded, routing to results entry or attempt
  // monitoring depending on the exam's mode, same split as the card below.
  const searchParams = useSearchParams();
  const deepLinkExamId = searchParams.get('examId');
  useEffect(() => {
    if (!deepLinkExamId || !allExams.length) return;
    const target = allExams.find((e) => e.id === deepLinkExamId);
    if (!target) return;
    if (target.mode === 'online') setMonitoringExam(target.id);
    else setActiveExam(target.id);
  }, [deepLinkExamId, allExams]);

  if (activeExam) {
    return <ResultsEntry examId={activeExam} onBack={() => setActiveExam(null)} readOnly={!isTeacher} />;
  }

  if (monitoringExam) {
    return <ExamMonitoringView examId={monitoringExam} onBack={() => setMonitoringExam(null)} readOnly={!isTeacher} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={isLoading ? 'Loading…' : `${allExams.length} exams`}
        actions={isTeacher ? <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Create exam</Button> : undefined}
      />

      {/* Toolbar — purely instrumental (filter by term, search once the
          list grows), kept visually lighter than the cards below it, same
          convention as Classes/Subjects/ID Cards/Timetable. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="max-w-xs flex-1">
          <Select value={termId} onValueChange={(v) => { setTermId(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.status !== 'active' ? ` (${t.status})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showSearch && (
          <div className="w-full sm:w-56">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search by title or class…" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-28 w-full" /></Card>)}
        </div>
      ) : allExams.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No exams yet"
            description={isTeacher ? 'Create an exam with its subjects, then enter and publish results.' : 'No exams have been created for this school yet.'}
            action={isTeacher ? <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Create exam</Button> : undefined}
          />
        </Card>
      ) : exams.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No exams match your search" description="Try a different title or class." /></Card>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedExams.map((e) => (
            <Card key={e.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{e.type} · {e.className ?? '—'}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <ModeBadge mode={e.mode} />
                    {isTeacher && (
                      <>
                        <button
                          type="button"
                          aria-label="Edit exam"
                          title="Edit exam"
                          onClick={() => setEditExamId(e.id)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete exam"
                          title="Delete exam"
                          onClick={() => setDeleteTarget({ id: e.id, title: e.title })}
                          className="rounded-md p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {e.published
                    ? <Badge variant="success">Published</Badge>
                    : e.gradedCount > 0
                      ? <Badge variant="primary">Graded</Badge>
                      : <Badge variant="neutral">Pending</Badge>}
                </div>
              </div>
              <div className="mt-3 flex-1 text-sm text-muted-foreground">
                {e.mode === 'online' ? 'Online exam' : `${e.subjectCount} subjects`} · {e.totalMarks} marks
                {e.examDate && <span className="block">{formatDate(e.examDate)}</span>}
              </div>
              {e.mode === 'online' ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setMonitoringExam(e.id)}
                  >
                    <Laptop size={15} /> {isTeacher ? 'Manage attempts' : 'View attempts'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Preview exam as student"
                    onClick={() => setPreviewExamId(e.id)}
                  >
                    <Eye size={15} />
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setActiveExam(e.id)}>
                  {isTeacher ? <><ClipboardList size={15} /> Enter results</> : <><Eye size={15} /> View results</>}
                </Button>
              )}
            </Card>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">Page {pageSafe} of {totalPages} · {exams.length} exam{exams.length === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" size="sm" disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Help — placed after the actual tool, same bottom-of-page pattern as
          Students, ID Cards, Academic Terms & Grading, Timetable, Classes,
          Subjects, Attendance and Fees, not before it. */}
      <div className="space-y-2">
        {isTeacher ? (
          <InfoNote title="Students can't see marks until you publish">
            <p>
              Entering and saving marks never shows anything to students or parents — they only see results once you
              click <strong>Publish</strong> on that exam. Until then the exam sits as &quot;Pending&quot; or
              &quot;Graded&quot;, visible only to staff.
            </p>
            <p>
              <strong>Publishing can&apos;t be undone</strong> from this screen, so double-check marks first. If one
              student&apos;s result isn&apos;t ready yet, use <strong>Withhold</strong> on that student before publishing
              — everyone else&apos;s result goes out, and theirs stays back until you release it.
            </p>
          </InfoNote>
        ) : (
          <InfoNote title="Read-only view">
            <p>
              You can see every exam, its results and online-attempt activity across the school, but creating,
              grading and publishing is handled by the class teacher.
            </p>
          </InfoNote>
        )}
      </div>

      {isTeacher && <CreateExamWizard open={addOpen} onClose={() => setAddOpen(false)} />}
      {isTeacher && editExamId && (
        <EditExamDrawer examId={editExamId} onClose={() => setEditExamId(null)} />
      )}
      {previewExamId && (
        <ExamPreviewModal examId={previewExamId} onClose={() => setPreviewExamId(null)} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={onConfirmDelete}
          title="Delete this exam?"
          description={
            <>
              This permanently deletes <strong>{deleteTarget.title}</strong>. Only possible while it has no recorded
              results or completed attempts — the server will refuse otherwise and explain why.
            </>
          }
          confirmLabel="Delete exam"
          tone="warning"
          loading={deleting}
          icon={Trash2}
        />
      )}
    </div>
  );
}

/** Read-only "preview as student" — reuses previewExam's sanitized question
 *  shape (no isCorrect/correctAnswer). Deliberately a lightweight standalone
 *  modal rather than reusing ExamTakingView's full stateful engine (timer,
 *  autosave, integrity tracking, submit) — none of that applies to a
 *  no-attempt preview, and forcing it through that component would mean
 *  threading a bunch of "is this a preview" branches through timer/autosave
 *  logic that a real student attempt depends on. */
function ExamPreviewModal({ examId, onClose }: { examId: string; onClose: () => void }) {
  const { data, isLoading, isError } = usePreviewExamQuery(examId);
  const preview = data?.data;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {preview ? preview.exam.title : 'Exam preview'}
            </h2>
            {preview?.exam.subjectName && (
              <p className="text-xs text-muted-foreground">{preview.exam.subjectName}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close preview">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError || !preview ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Could not load exam preview.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Duration: {preview.exam.durationMinutes} min · Max attempts: {preview.exam.maxAttempts} ·{' '}
                {preview.questions.length} question{preview.questions.length === 1 ? '' : 's'}
              </p>
              {preview.questions.map((q, i) => (
                <div key={q.questionIndex} className="rounded-lg border border-border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Question {i + 1} · {q.marks} mark{q.marks === 1 ? '' : 's'}
                    {q.negativeMarks ? ` · -${q.negativeMarks} if wrong` : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{q.text}</p>
                  {q.options && q.options.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {q.options.map((opt) => (
                        <li
                          key={opt.optionIndex}
                          className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
                        >
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Create Exam — guided step wizard
//
// UX rationale: the old form dumped ~15 fields into one long scroll with
// mode buried in a 6-option select midway down, and online exams required
// leaving this screen entirely to pre-build questions in a separate
// "Question Bank" page before they could even be selected here. That's
// gone — questions are authored inline, right where they're used, and the
// whole flow is broken into 4 short, clearly-labeled steps so a teacher
// always knows how much is left and never faces a wall of fields at once:
//   1. Basics   — title/type/class/date/mode (mode drives step 2 & 3)
//   2. Content  — subjects+marks (written/other) OR questions (online)
//   3. Settings — online-only (duration/window/integrity/shuffle);
//                 skipped automatically for every other mode
//   4. Review   — a plain-language summary before the one Create click
// ─────────────────────────────────────────────────────────────────────────

const questionOptionSchema = z.object({
  text: z.string().min(1, 'Required'),
  isCorrect: z.boolean(),
});

const questionSchema = z
  .object({
    type: z.enum(['mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'essay', 'fill_blank', 'numeric']),
    text: z.string().min(1, 'Question text is required'),
    options: z.array(questionOptionSchema).optional(),
    correctAnswer: z.string().optional(),
    marks: z.coerce.number().min(0, '≥ 0'),
    negativeMarks: z.coerce.number().min(0).optional(),
  })
  .superRefine((d, ctx) => {
    const mcqLike = d.type === 'mcq_single' || d.type === 'mcq_multi' || d.type === 'true_false';
    if (mcqLike) {
      if (!d.options || d.options.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'At least 2 options are required' });
        return;
      }
      const correctCount = d.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Mark at least one option correct' });
      if (d.type === 'mcq_single' && correctCount > 1) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Only one option can be correct' });
      if (d.type === 'true_false' && d.options.length !== 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'True/False needs exactly 2 options' });
    } else if (['fill_blank', 'numeric', 'short_answer'].includes(d.type) && !d.correctAnswer?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'A reference answer is required' });
    }
  });

const subjectSchema = z.object({
  name: z.string().min(1, 'Required'),
  totalMarks: z.coerce.number().int().min(1, '≥ 1'),
  notes: z.string().optional(),
});

const schema = z
  .object({
    title: z.string().min(1, 'Required'),
    type: z.enum(['midterm', 'final', 'unit', 'monthly', 'board']),
    mode: z.enum(['online', 'physical', 'oral', 'practical', 'project', 'assignment']),
    classId: z.string().min(1, 'Select a class'),
    examDate: z.string().optional(),
    subjects: z.array(subjectSchema).optional(),
    // Global pass/fail cutoff for the exam as a whole -- defaults to 40 on
    // the backend if left blank (see exam.service.ts), so blank must map to
    // undefined here, not to the number 0.
    passingPercentage: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().min(0).max(100).optional()
    ),

    subjectName: z.string().optional(),
    questions: z.array(questionSchema).optional(),
    durationMinutes: z.coerce.number().optional(),
    windowStart: z.string().optional(),
    windowEnd: z.string().optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    maxAttempts: z.coerce.number().optional(),
    integrityMode: z.enum(['none', 'flag_only', 'fullscreen_lock']).optional(),
    autoSubmitOnTimeout: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.mode === 'online') {
      if (!d.subjectName || !d.subjectName.trim()) {
        ctx.addIssue({ code: 'custom', path: ['subjectName'], message: 'Subject is required' });
      }
      if (!d.questions || d.questions.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['questions'], message: 'Add at least one question' });
      }
      if (!d.durationMinutes || d.durationMinutes <= 0) {
        ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Duration must be > 0' });
      }
      if (!d.windowStart) {
        ctx.addIssue({ code: 'custom', path: ['windowStart'], message: 'Start is required' });
      }
      if (!d.windowEnd) {
        ctx.addIssue({ code: 'custom', path: ['windowEnd'], message: 'End is required' });
      }
      if (d.windowStart && d.windowEnd && new Date(d.windowEnd) <= new Date(d.windowStart)) {
        ctx.addIssue({ code: 'custom', path: ['windowEnd'], message: 'End must be after start' });
      }
    } else if (!d.subjects || d.subjects.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['subjects'], message: 'Add at least one subject' });
    }
  });
type ExamForm = z.infer<typeof schema>;

const defaultValues: ExamForm = {
  title: '',
  type: 'midterm',
  mode: 'physical',
  classId: '',
  examDate: '',
  subjects: [{ name: 'Mathematics', totalMarks: 100, notes: '' }],
  passingPercentage: undefined,
  subjectName: '',
  questions: [],
  durationMinutes: 30,
  windowStart: '',
  windowEnd: '',
  shuffleQuestions: false,
  shuffleOptions: false,
  maxAttempts: 1,
  integrityMode: 'fullscreen_lock',
  autoSubmitOnTimeout: true,
};

const STEP_LABELS = ['Basics', 'Content', 'Settings', 'Review'];

function StepIndicator({ current, total, mode }: { current: number; total: number; mode: ExamMode }) {
  // Step 3 (Settings) doesn't apply outside 'online' — shown dimmed/skipped
  // rather than removed, so the teacher can see the full shape of the flow
  // and isn't confused when the step count "jumps" from 2 to 4.
  return (
    <div className="flex items-center gap-1.5 px-5 pb-3 pt-1">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const skipped = stepNum === 3 && mode !== 'online';
        const active = stepNum === current;
        const done = stepNum < current && !(skipped && stepNum === 3);
        return (
          <div key={label} className="flex flex-1 items-center gap-1.5">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  active ? 'bg-primary text-primary-foreground'
                    : done ? 'bg-primary-soft text-primary'
                    : skipped ? 'bg-muted text-muted-foreground/50'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check size={13} /> : stepNum}
              </div>
              <span className={cn('text-center text-[10px] font-medium leading-tight', active ? 'text-foreground' : 'text-muted-foreground', skipped && 'text-muted-foreground/50')}>
                {label}{skipped ? ' (n/a)' : ''}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className={cn('h-px flex-1', done ? 'bg-primary/40' : 'bg-border')} />}
          </div>
        );
      })}
    </div>
  );
}

function CreateExamWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const terminology = useTerminology();
  // This wizard only ever creates a NEW exam (no edit mode) -- an archived
  // class has no business being offered as a place to schedule one, same
  // reasoning as the Subjects/Timetable class pickers.
  const { data: classesRes } = useGetClassesQuery({ activeOnly: true });
  const classes = classesRes?.data ?? [];
  const noClasses = classes.length === 0;
  const [createExam, { isLoading }] = useCreateExamMutation();
  const [step, setStep] = useState(1);

  const { register, control, handleSubmit, reset, watch, trigger, formState: { errors } } = useForm<ExamForm>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'subjects' });
  const mode = watch('mode');
  const questions = watch('questions') ?? [];

  const totalSteps = 4;
  const contentStepFields = mode === 'online'
    ? (['subjectName', 'questions'] as const)
    : (['subjects'] as const);
  const settingsStepFields = ['durationMinutes', 'windowStart', 'windowEnd'] as const;

  const goNext = async () => {
    if (step === 1) {
      const ok = await trigger(['title', 'type', 'classId']);
      if (!ok) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await trigger(contentStepFields as any);
      if (!ok) return;
      // Non-online modes have nothing to configure in step 3 — skip
      // straight to Review rather than showing an empty screen.
      setStep(mode === 'online' ? 3 : 4);
      return;
    }
    if (step === 3) {
      const ok = await trigger(settingsStepFields as any);
      if (!ok) return;
      setStep(4);
    }
  };

  const goBack = () => {
    if (step === 4 && mode !== 'online') { setStep(2); return; }
    setStep((s) => Math.max(1, s - 1));
  };

  const closeAndReset = () => {
    reset(defaultValues);
    setStep(1);
    onClose();
  };

  const onSubmit = async (values: ExamForm) => {
    try {
      if (values.mode === 'online') {
        await createExam({
          title: values.title,
          type: values.type,
          mode: values.mode,
          classId: values.classId,
          examDate: values.examDate || undefined,
          passingPercentage: values.passingPercentage,
          subjectName: values.subjectName,
          questions: (values.questions ?? []) as ExamQuestion[],
          durationMinutes: values.durationMinutes,
          windowStart: values.windowStart ? new Date(values.windowStart).toISOString() : undefined,
          windowEnd: values.windowEnd ? new Date(values.windowEnd).toISOString() : undefined,
          shuffleQuestions: values.shuffleQuestions,
          shuffleOptions: values.shuffleOptions,
          maxAttempts: values.maxAttempts,
          integrityMode: values.integrityMode,
          autoSubmitOnTimeout: values.autoSubmitOnTimeout,
        }).unwrap();
      } else {
        await createExam({
          title: values.title,
          type: values.type,
          mode: values.mode,
          classId: values.classId,
          examDate: values.examDate || undefined,
          passingPercentage: values.passingPercentage,
          subjects: (values.subjects ?? []).map((s) => ({
            name: s.name,
            totalMarks: s.totalMarks,
            notes: s.notes || undefined,
          })),
        }).unwrap();
      }
      toast.success('Exam created');
      closeAndReset();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not create exam');
    }
  };

  const selectedClass = classes.find((c) => c.id === watch('classId'));
  const totalQuestionMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const totalSubjectMarks = (watch('subjects') ?? []).reduce((s, sub) => s + (Number(sub.totalMarks) || 0), 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <SheetContent side="right" hideClose className="flex w-full flex-col bg-card text-card-foreground sm:w-[560px]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Create Exam</h2>
          <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
        </div>

        <StepIndicator current={step} total={totalSteps} mode={mode} />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {noClasses && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>Create a {terminology.classUnit.toLowerCase()} first ({terminology.classUnitPlural} page) — exams need a {terminology.classUnit.toLowerCase()} to belong to.</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="e.g. Mid-term 2026" {...register('title')} />
                  {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Controller
                      control={control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{terminology.classUnit}</Label>
                    <Controller
                      control={control}
                      name="classId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder={`Select ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
                          <SelectContent>
                            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.classId && <p className="mt-1 text-xs text-danger">{errors.classId.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="examDate">Exam date (optional)</Label>
                  <input id="examDate" type="date" {...register('examDate')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div>
                  <Label className="mb-2">How will this be taken?</Label>
                  <Controller
                    control={control}
                    name="mode"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {MODES.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => field.onChange(m.value)}
                            className={cn(
                              'rounded-xl border p-3 text-left transition-colors',
                              field.value === m.value
                                ? 'border-primary bg-primary-soft'
                                : 'border-border hover:bg-muted'
                            )}
                          >
                            <p className={cn('text-sm font-semibold', field.value === m.value ? 'text-primary' : 'text-foreground')}>{m.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {step === 2 && mode !== 'online' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="mb-0">Subjects & marks</Label>
                  <span className="text-xs text-muted-foreground">{totalSubjectMarks} total marks</span>
                </div>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={f.id} className="space-y-1.5 rounded-lg border border-border p-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Subject" className="flex-1" {...register(`subjects.${i}.name` as const)} />
                        <Input type="number" placeholder="Total" className="w-24" {...register(`subjects.${i}.totalMarks` as const)} />
                        <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Input placeholder="Optional — rubric notes, viva topics, practical setup, etc." {...register(`subjects.${i}.notes` as const)} />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => append({ name: '', totalMarks: 100, notes: '' })} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus size={13} /> Add subject
                </button>
                {errors.subjects && <p className="mt-1 text-xs text-danger">{(errors.subjects as any).message || 'Check subjects'}</p>}
              </div>
            )}

            {step === 2 && mode === 'online' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subjectName">Subject</Label>
                  <Input id="subjectName" placeholder="e.g. Physics" {...register('subjectName')} />
                  {errors.subjectName && <p className="mt-1 text-xs text-danger">{errors.subjectName.message}</p>}
                </div>
                <QuestionBuilder control={control} totalMarks={totalQuestionMarks} />
                {errors.questions && typeof (errors.questions as any).message === 'string' && (
                  <p className="text-xs text-danger">{(errors.questions as any).message}</p>
                )}
              </div>
            )}

            {step === 3 && mode === 'online' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                    <Input id="durationMinutes" type="number" {...register('durationMinutes')} />
                    {errors.durationMinutes && <p className="mt-1 text-xs text-danger">{errors.durationMinutes.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="maxAttempts">Max attempts</Label>
                    <Input id="maxAttempts" type="number" {...register('maxAttempts')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="windowStart">Window start</Label>
                    <input id="windowStart" type="datetime-local" {...register('windowStart')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    {errors.windowStart && <p className="mt-1 text-xs text-danger">{errors.windowStart.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="windowEnd">Window end</Label>
                    <input id="windowEnd" type="datetime-local" {...register('windowEnd')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    {errors.windowEnd && <p className="mt-1 text-xs text-danger">{errors.windowEnd.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="integrityMode">Integrity mode</Label>
                  <Controller
                    control={control}
                    name="integrityMode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="integrityMode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INTEGRITY_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-border p-3">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('shuffleQuestions')} />
                    Shuffle questions
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('shuffleOptions')} />
                    Shuffle options
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('autoSubmitOnTimeout')} />
                    Auto-submit on timeout
                  </label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Double-check the details below, then create the exam.</p>
                <Card className="space-y-2.5 p-4 text-sm">
                  <SummaryRow label="Title" value={watch('title') || '—'} />
                  <SummaryRow label="Type" value={TYPES.find((t) => t.value === watch('type'))?.label ?? '—'} />
                  <SummaryRow label={terminology.classUnit} value={selectedClass?.name ?? '—'} />
                  <SummaryRow label="Mode" value={MODES.find((m) => m.value === mode)?.label ?? '—'} />
                  {watch('examDate') && <SummaryRow label="Date" value={watch('examDate')!} />}
                  {mode === 'online' ? (
                    <>
                      <SummaryRow label="Subject" value={watch('subjectName') || '—'} />
                      <SummaryRow label="Questions" value={`${questions.length} · ${totalQuestionMarks} marks`} />
                      <SummaryRow label="Duration" value={`${watch('durationMinutes') || 0} min`} />
                      <SummaryRow label="Attempts allowed" value={String(watch('maxAttempts') || 1)} />
                    </>
                  ) : (
                    <SummaryRow label="Subjects" value={`${(watch('subjects') ?? []).length} · ${totalSubjectMarks} marks`} />
                  )}
                </Card>
                <div>
                  <Label htmlFor="passingPercentage">Pass mark (%)</Label>
                  <Input
                    id="passingPercentage"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Defaults to 40%"
                    {...register('passingPercentage')}
                  />
                  {errors.passingPercentage && <p className="mt-1 text-xs text-danger">{errors.passingPercentage.message}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={goBack}>
                <ChevronLeft size={16} /> Back
              </Button>
            ) : (
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            )}
            {step < 4 ? (
              <Button type="button" onClick={goNext} disabled={noClasses}>
                Next <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="submit" loading={isLoading} disabled={noClasses}>
                <Check size={16} /> Create exam
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Edit an existing exam. Only the fields updateExam() actually accepts are
// editable here (title/examDate/passingPercentage/subjects, plus the
// online-mode live-exam fields questions/durationMinutes/window) — type,
// mode, and class are permanent once an exam is created (see
// exam.validator.ts's updateExamSchema) and are shown read-only for
// context. A single-page form rather than the create wizard's multi-step
// flow, since there's no "pick mode / pick class" decision to walk through
// here — just "here's what this exam currently is, change what you need".
// ─────────────────────────────────────────────────────────────────────────

const editSchema = z
  .object({
    title: z.string().min(1, 'Required'),
    examDate: z.string().optional(),
    // Blank must map to undefined (falls back to the backend's own
    // default), not to the number 0 — same reasoning as the create
    // wizard's passingPercentage field.
    passingPercentage: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().min(0).max(100).optional()
    ),
    subjects: z.array(subjectSchema).optional(),
    questions: z.array(questionSchema).optional(),
    durationMinutes: z.coerce.number().optional(),
    windowStart: z.string().optional(),
    windowEnd: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.windowStart && d.windowEnd && new Date(d.windowEnd) <= new Date(d.windowStart)) {
      ctx.addIssue({ code: 'custom', path: ['windowEnd'], message: 'End must be after start' });
    }
  });
type EditExamForm = z.infer<typeof editSchema>;

/** yyyy-MM-ddThh:mm, the format <input type="datetime-local"> needs — an
 *  ISO string straight from the backend has seconds/a trailing Z and won't
 *  populate the input at all. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditExamDrawer({ examId, onClose }: { examId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useGetExamForEditQuery(examId);
  const exam = data?.data;
  const [updateExam, { isLoading: saving }] = useUpdateExamMutation();

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<EditExamForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: '', examDate: '', subjects: [], questions: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'subjects' });
  const questions = watch('questions') ?? [];
  const totalQuestionMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const totalSubjectMarks = (watch('subjects') ?? []).reduce((s, x) => s + (Number(x.totalMarks) || 0), 0);

  // Reset the form once the exam data actually arrives — it's fetched
  // fresh per drawer-open (examId only ever changes by remounting via the
  // `key` below), so this only needs to fire once per open, not on every
  // keystroke re-render.
  useEffect(() => {
    if (!exam) return;
    reset({
      title: exam.title,
      examDate: exam.examDate ? exam.examDate.slice(0, 10) : '',
      passingPercentage: exam.passingPercentage,
      subjects: exam.subjects.map((s) => ({ name: s.name, totalMarks: s.totalMarks, notes: s.notes ?? '' })),
      questions: exam.questions,
      durationMinutes: exam.durationMinutes ?? undefined,
      windowStart: toDatetimeLocal(exam.windowStart),
      windowEnd: toDatetimeLocal(exam.windowEnd),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  const onSubmit = async (values: EditExamForm) => {
    if (!exam) return;
    try {
      const body: Record<string, unknown> = {
        title: values.title,
        examDate: values.examDate || undefined,
        passingPercentage: values.passingPercentage,
      };
      if (exam.mode === 'online') {
        body.questions = values.questions;
        body.durationMinutes = values.durationMinutes;
        if (values.windowStart) body.windowStart = new Date(values.windowStart).toISOString();
        if (values.windowEnd) body.windowEnd = new Date(values.windowEnd).toISOString();
      } else {
        body.subjects = (values.subjects ?? []).map((s) => ({
          name: s.name,
          totalMarks: s.totalMarks,
          notes: s.notes || undefined,
        }));
      }
      await updateExam({ examId, body }).unwrap();
      toast.success('Exam updated');
      onClose();
    } catch (e) {
      // The backend refuses to touch the live-exam fields once a student
      // has an in-progress attempt (EXAM_HAS_ACTIVE_ATTEMPTS) -- surface
      // that reason directly rather than a generic failure.
      toast.error(getErrorMessage(e, 'Could not update this exam'));
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">Edit exam</h3>
          <SheetClose asChild><button type="button" aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button></SheetClose>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-8 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : isError || !exam ? (
          <div className="p-5"><EmptyState icon={AlertCircle} title="Couldn't load this exam" description="There was a problem reaching the server." /></div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Permanent, read-only context -- type/mode/class can't be
                  changed once an exam is created (updateExamSchema simply
                  doesn't accept them), so there's nothing to edit here,
                  only to confirm you're editing the right exam. */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">{exam.type}</Badge>
                <ModeBadge mode={exam.mode} />
                <span>{exam.className}</span>
                {exam.published && <Badge variant="success">Published</Badge>}
              </div>

              {exam.published && (
                <div className="rounded-lg bg-warning-soft p-3 text-xs text-warning">
                  This exam is already published — saving here changes it immediately with no separate confirmation
                  or notification to students/parents.
                </div>
              )}

              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" {...register('title')} />
                {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="edit-examDate">Date</Label>
                <input id="edit-examDate" type="date" {...register('examDate')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>

              <div>
                <Label htmlFor="edit-passingPercentage">Pass mark (%)</Label>
                <Input id="edit-passingPercentage" type="number" min={0} max={100} placeholder="Defaults to 40%" {...register('passingPercentage')} />
                {errors.passingPercentage && <p className="mt-1 text-xs text-danger">{errors.passingPercentage.message}</p>}
              </div>

              {exam.mode === 'online' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-duration">Duration (min)</Label>
                      <Input id="edit-duration" type="number" min={1} {...register('durationMinutes')} />
                    </div>
                    <div />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-windowStart">Window start</Label>
                      <input id="edit-windowStart" type="datetime-local" {...register('windowStart')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div>
                      <Label htmlFor="edit-windowEnd">Window end</Label>
                      <input id="edit-windowEnd" type="datetime-local" {...register('windowEnd')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      {errors.windowEnd && <p className="mt-1 text-xs text-danger">{errors.windowEnd.message}</p>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Blocked while a student has this exam in progress — the server will explain if that's the case.
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Label className="mb-0">Questions</Label>
                      <span className="text-xs text-muted-foreground">{totalQuestionMarks} total marks</span>
                    </div>
                    <QuestionBuilder control={control} totalMarks={totalQuestionMarks} />
                  </div>
                </>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="mb-0">Subjects & marks</Label>
                    <span className="text-xs text-muted-foreground">{totalSubjectMarks} total marks</span>
                  </div>
                  <div className="space-y-2">
                    {fields.map((f, i) => (
                      <div key={f.id} className="space-y-1.5 rounded-lg border border-border p-2">
                        <div className="flex items-center gap-2">
                          <Input placeholder="Subject" className="flex-1" {...register(`subjects.${i}.name` as const)} />
                          <Input type="number" placeholder="Total" className="w-24" {...register(`subjects.${i}.totalMarks` as const)} />
                          <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <Input placeholder="Optional — rubric notes, viva topics, practical setup, etc." {...register(`subjects.${i}.notes` as const)} />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => append({ name: '', totalMarks: 100, notes: '' })} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus size={13} /> Add subject
                  </button>
                  {errors.subjects && <p className="mt-1 text-xs text-danger">{(errors.subjects as any).message || 'Check subjects'}</p>}
                  {exam.published && (
                    <p className="mt-2 text-xs text-warning">
                      Renaming a subject after marks were entered under its old name can leave that subject&apos;s
                      marks orphaned — safest to only rename before results are entered.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving}>
                <Check size={16} /> Save changes
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inline question authoring — replaces the removed "Question Bank" picker.
// A teacher fills a small draft form (type-aware: MCQ/True-False show an
// options list with correctness toggles, others show a reference-answer
// field) and adds it to the exam's question list right here — no separate
// screen, no pre-built bank to maintain beforehand.
// ─────────────────────────────────────────────────────────────────────────

const emptyDraft = (): ExamQuestion => ({
  type: 'mcq_single',
  text: '',
  options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
  marks: 1,
  negativeMarks: 0,
});

function QuestionBuilder({ control, totalMarks }: { control: any; totalMarks: number }) {
  const { fields, append, remove, update } = useFieldArray({ control, name: 'questions' });
  const [draft, setDraft] = useState<ExamQuestion>(emptyDraft());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(fields.length === 0);
  const [draftError, setDraftError] = useState<string | null>(null);

  const mcqLike = draft.type === 'mcq_single' || draft.type === 'mcq_multi' || draft.type === 'true_false';
  const needsAnswer = draft.type === 'fill_blank' || draft.type === 'numeric' || draft.type === 'short_answer';

  const validateDraft = (): string | null => {
    if (!draft.text.trim()) return 'Question text is required';
    if (mcqLike) {
      const opts = draft.options ?? [];
      if (opts.length < 2) return 'Add at least 2 options';
      if (opts.some((o) => !o.text.trim())) return 'Every option needs text';
      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount === 0) return 'Mark at least one option correct';
      if (draft.type === 'mcq_single' && correctCount > 1) return 'mcq_single allows only one correct option';
      if (draft.type === 'true_false' && opts.length !== 2) return 'True/False needs exactly 2 options';
    } else if (needsAnswer && !draft.correctAnswer?.trim()) {
      return 'A reference/correct answer is required';
    }
    if (!draft.marks || draft.marks <= 0) return 'Marks must be greater than 0';
    return null;
  };

  const resetDraft = () => {
    setDraft(emptyDraft());
    setEditingIndex(null);
    setDraftError(null);
  };

  const saveDraft = () => {
    const err = validateDraft();
    if (err) { setDraftError(err); return; }
    if (editingIndex !== null) {
      update(editingIndex, draft);
    } else {
      append(draft);
    }
    resetDraft();
    setFormOpen(false);
  };

  const editQuestion = (i: number) => {
    setDraft(fields[i] as unknown as ExamQuestion);
    setEditingIndex(i);
    setDraftError(null);
    setFormOpen(true);
  };

  const setOption = (i: number, patch: Partial<{ text: string; isCorrect: boolean }>) => {
    setDraft((d) => {
      const options = [...(d.options ?? [])];
      options[i] = { ...options[i], ...patch };
      // mcq_single/true_false: only one option can be correct — checking a
      // new one automatically clears the previous choice, same UX as a
      // native radio group.
      if (patch.isCorrect && (d.type === 'mcq_single' || d.type === 'true_false')) {
        options.forEach((o, idx) => { if (idx !== i) o.isCorrect = false; });
      }
      return { ...d, options };
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="mb-0">Questions</Label>
        <span className="text-xs text-muted-foreground">{fields.length} added · {totalMarks} marks</span>
      </div>

      {fields.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {fields.map((f, i) => {
            const q = f as unknown as ExamQuestion;
            return (
              <div key={f.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-foreground" title={q.text}>{q.text || '(empty)'}</span>
                <Badge variant="outline" className="shrink-0">{QUESTION_TYPES.find((t) => t.value === q.type)?.label.split(' (')[0]}</Badge>
                <span className="shrink-0 text-xs text-muted-foreground">{q.marks} pt</span>
                <button type="button" onClick={() => editQuestion(i)} aria-label="Edit question" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => remove(i)} aria-label="Remove question" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!formOpen ? (
        <button
          type="button"
          onClick={() => { resetDraft(); setFormOpen(true); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-primary hover:bg-primary-soft"
        >
          <Plus size={15} /> Add question
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label className="mb-0 flex items-center gap-1.5"><ListChecks size={14} /> {editingIndex !== null ? 'Edit question' : 'New question'}</Label>
            {(fields.length > 0 || editingIndex !== null) && (
              <button type="button" onClick={() => { resetDraft(); setFormOpen(false); }} aria-label="Close" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>

          <Select
            value={draft.type}
            onValueChange={(value) => {
              const type = value as QuestionType;
              const isMcqLike = type === 'mcq_single' || type === 'mcq_multi' || type === 'true_false';
              setDraft((d) => ({
                ...d,
                type,
                options: type === 'true_false'
                  ? [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }]
                  : isMcqLike
                    ? (d.options && d.options.length >= 2 ? d.options : [{ text: '', isCorrect: true }, { text: '', isCorrect: false }])
                    : undefined,
                correctAnswer: isMcqLike ? undefined : d.correctAnswer,
              }));
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <textarea
            value={draft.text}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            placeholder="Question text…"
            rows={2}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {mcqLike && (
            <div className="space-y-1.5">
              {(draft.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type={draft.type === 'mcq_single' || draft.type === 'true_false' ? 'radio' : 'checkbox'}
                    checked={opt.isCorrect}
                    onChange={(e) => setOption(i, { isCorrect: e.target.checked })}
                    className="h-4 w-4 shrink-0 rounded border-input"
                    aria-label={`Option ${i + 1} correct`}
                  />
                  <Input
                    value={opt.text}
                    onChange={(e) => setOption(i, { text: e.target.value })}
                    placeholder={`Option ${i + 1}`}
                    disabled={draft.type === 'true_false'}
                    className="flex-1"
                  />
                  {draft.type !== 'true_false' && (draft.options?.length ?? 0) > 2 && (
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, options: (d.options ?? []).filter((_, idx) => idx !== i) }))}
                      aria-label="Remove option"
                      className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {draft.type !== 'true_false' && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, options: [...(d.options ?? []), { text: '', isCorrect: false }] }))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus size={12} /> Add option
                </button>
              )}
            </div>
          )}

          {needsAnswer && (
            <Input
              value={draft.correctAnswer ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, correctAnswer: e.target.value }))}
              placeholder={draft.type === 'essay' ? 'Optional — grading notes' : 'Correct / reference answer'}
            />
          )}
          {draft.type === 'essay' && !needsAnswer && (
            <Input
              value={draft.correctAnswer ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, correctAnswer: e.target.value }))}
              placeholder="Optional — grading notes shown only to you"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 text-xs">Marks</Label>
              <Input type="number" value={draft.marks} onChange={(e) => setDraft((d) => ({ ...d, marks: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Negative marks</Label>
              <Input type="number" value={draft.negativeMarks ?? 0} onChange={(e) => setDraft((d) => ({ ...d, negativeMarks: Number(e.target.value) }))} />
            </div>
          </div>

          {draftError && <p className="text-xs text-danger">{draftError}</p>}

          <div className="flex justify-end gap-2">
            {editingIndex !== null && (
              <Button type="button" variant="secondary" size="sm" onClick={resetDraft}>Cancel</Button>
            )}
            <Button type="button" size="sm" onClick={saveDraft}>
              <Check size={14} /> {editingIndex !== null ? 'Save changes' : 'Add question'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
