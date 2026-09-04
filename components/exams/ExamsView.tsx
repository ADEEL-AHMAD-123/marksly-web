'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, FileText, ClipboardList, Laptop, Eye, Loader2, AlertCircle } from 'lucide-react';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetExamsQuery, useCreateExamMutation, usePreviewExamQuery, type ExamType, type ExamMode, type IntegrityMode } from '@/store/api/examsApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import { useGetQuestionsQuery } from '@/store/api/questionsApi';
import { formatDate } from '@/lib/utils';
import { ResultsEntry } from './ResultsEntry';
import { ExamMonitoringView } from './ExamMonitoringView';

const TYPES: { value: ExamType; label: string }[] = [
  { value: 'midterm', label: 'Mid-term' },
  { value: 'final', label: 'Final' },
  { value: 'unit', label: 'Unit test' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'board', label: 'Board' },
];

const MODES: { value: ExamMode; label: string }[] = [
  { value: 'physical', label: 'Physical (paper exam, enter marks manually)' },
  { value: 'online', label: 'Online (students take the test in the app)' },
  { value: 'oral', label: 'Oral (viva / spoken assessment)' },
  { value: 'practical', label: 'Practical (lab / hands-on assessment)' },
  { value: 'project', label: 'Project (submitted work, graded manually)' },
  { value: 'assignment', label: 'Assignment (take-home work, graded manually)' },
];

const INTEGRITY_MODES: { value: IntegrityMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'flag_only', label: 'Flag only' },
  { value: 'fullscreen_lock', label: 'Fullscreen lock' },
];

function ModeBadge({ mode }: { mode: ExamMode }) {
  if (mode === 'online') return <Badge variant="primary">Online</Badge>;
  const label = MODES.find((m) => m.value === mode)?.label.split(' (')[0] ?? mode;
  return <Badge variant="neutral" className="capitalize">{label}</Badge>;
}

export function ExamsView({ title = 'Exams' }: { title?: string }) {
  const [termId, setTermId] = useState('all');
  const { data, isLoading } = useGetExamsQuery({ termId: termId === 'all' ? undefined : termId });
  const exams = data?.data ?? [];
  const { data: termsRes } = useGetTermsQuery();
  // Show ALL terms (not just active) — a teacher may want to check exams
  // from a recently-closed term.
  const terms = termsRes?.data ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [activeExam, setActiveExam] = useState<string | null>(null);
  const [monitoringExam, setMonitoringExam] = useState<string | null>(null);
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);

  if (activeExam) {
    return <ResultsEntry examId={activeExam} onBack={() => setActiveExam(null)} />;
  }

  if (monitoringExam) {
    return <ExamMonitoringView examId={monitoringExam} onBack={() => setMonitoringExam(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={isLoading ? 'Loading…' : `${exams.length} exams`}
        actions={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Create exam</Button>}
      />

      <Card className="p-4">
        <div className="max-w-xs">
          <Select value={termId} onValueChange={setTermId}>
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
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-28 w-full" /></Card>)}
        </div>
      ) : exams.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No exams yet" description="Create an exam with its subjects, then enter and publish results." action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Create exam</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => (
            <Card key={e.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{e.type} · {e.className ?? '—'}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ModeBadge mode={e.mode} />
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
                    <Laptop size={15} /> Manage attempts
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
                  <ClipboardList size={15} /> Enter results
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateExamDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      {previewExamId && (
        <ExamPreviewModal examId={previewExamId} onClose={() => setPreviewExamId(null)} />
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

    subjectName: z.string().optional(),
    questionIds: z.array(z.string()).optional(),
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
      if (!d.questionIds || d.questionIds.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['questionIds'], message: 'Select at least one question' });
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
  subjectName: '',
  questionIds: [],
  durationMinutes: 60,
  windowStart: '',
  windowEnd: '',
  shuffleQuestions: false,
  shuffleOptions: false,
  maxAttempts: 1,
  integrityMode: 'fullscreen_lock',
  autoSubmitOnTimeout: true,
};

function CreateExamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const noClasses = classes.length === 0;
  const [createExam, { isLoading }] = useCreateExamMutation();

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<ExamForm>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'subjects' });
  const mode = watch('mode');

  const onSubmit = async (values: ExamForm) => {
    try {
      if (values.mode === 'online') {
        await createExam({
          title: values.title,
          type: values.type,
          mode: values.mode,
          classId: values.classId,
          examDate: values.examDate || undefined,
          subjectName: values.subjectName,
          questionIds: values.questionIds,
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
          subjects: (values.subjects ?? []).map((s) => ({
            name: s.name,
            totalMarks: s.totalMarks,
            notes: s.notes || undefined,
          })),
        }).unwrap();
      }
      toast.success('Exam created');
      reset(defaultValues);
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not create exam');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[520px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Create Exam</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {noClasses && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>Create a class first (Classes page) — exams need a class to belong to.</span>
              </div>
            )}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Mid-term 2026" {...register('title')} />
              {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select {...register('type')} className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Class</Label>
                <Controller
                  control={control}
                  name="classId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
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
              <Label>Mode</Label>
              <Controller
                control={control}
                name="mode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      {MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label htmlFor="examDate">Exam date (optional)</Label>
              <input id="examDate" type="date" {...register('examDate')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>

            {mode !== 'online' ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="mb-0">Subjects</Label>
                  <button type="button" onClick={() => append({ name: '', totalMarks: 100, notes: '' })} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus size={13} /> Add
                  </button>
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
                {errors.subjects && <p className="mt-1 text-xs text-danger">{(errors.subjects as any).message || 'Check subjects'}</p>}
              </div>
            ) : (
              <OnlineExamFields control={control} register={register} errors={errors} />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading} disabled={noClasses}>Create exam</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function OnlineExamFields({ control, register, errors }: { control: any; register: any; errors: any }) {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { data: questionsRes, isLoading } = useGetQuestionsQuery({
    subjectName: subjectFilter || undefined,
    type: typeFilter === 'all' ? undefined : (typeFilter as any),
    limit: 100,
  });
  const questions = questionsRes?.data ?? [];

  return (
    <Controller
      control={control}
      name="questionIds"
      render={({ field }) => {
        const selected: string[] = field.value ?? [];
        const selectedQuestions = questions.filter((q) => selected.includes(q.id));
        const totalMarks = selectedQuestions.reduce((s, q) => s + q.marks, 0);

        const toggle = (id: string) => {
          field.onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
        };

        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subjectName">Subject</Label>
              <Input id="subjectName" placeholder="e.g. Physics" {...register('subjectName')} />
              {errors.subjectName && <p className="mt-1 text-xs text-danger">{errors.subjectName.message}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="mb-0">Questions</Label>
                <span className="text-xs text-muted-foreground">Selected: {selected.length} · {totalMarks} marks</span>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Filter by subject"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All types</option>
                  <option value="mcq_single">MCQ (single)</option>
                  <option value="mcq_multi">MCQ (multi)</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short answer</option>
                  <option value="essay">Essay</option>
                  <option value="fill_blank">Fill in the blank</option>
                  <option value="numeric">Numeric</option>
                </select>
              </div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
                {isLoading ? (
                  <p className="p-2 text-xs text-muted-foreground">Loading questions…</p>
                ) : questions.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">No questions found in the bank.</p>
                ) : (
                  questions.map((q) => (
                    <label key={q.id} className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-muted">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                        checked={selected.includes(q.id)}
                        onChange={() => toggle(q.id)}
                      />
                      <span className="flex-1 truncate text-sm text-foreground" title={q.text}>{q.text}</span>
                      <Badge variant="outline" className="shrink-0">{q.type.replace('_', ' ')}</Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">{q.marks} pt</span>
                    </label>
                  ))
                )}
              </div>
              {errors.questionIds && <p className="mt-1 text-xs text-danger">{errors.questionIds.message}</p>}
            </div>

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
              <select id="integrityMode" {...register('integrityMode')} className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {INTEGRITY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
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
        );
      }}
    />
  );
}
