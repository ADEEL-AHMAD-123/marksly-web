'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, X, HelpCircle, Archive, Pencil, AlertTriangle, Upload,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import {
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useArchiveQuestionMutation,
  useGetQuestionUsageCountQuery,
  useBulkImportQuestionsMutation,
  type Question,
  type QuestionType,
  type QuestionDifficulty,
} from '@/store/api/questionsApi';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';

const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq_single', label: 'MCQ (single answer)' },
  { value: 'mcq_multi', label: 'MCQ (multiple answers)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'fill_blank', label: 'Fill in the blank' },
  { value: 'numeric', label: 'Numeric' },
];

const TYPE_LABEL: Record<QuestionType, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label])) as Record<QuestionType, string>;

const DIFFICULTIES: { value: QuestionDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const MCQ_LIKE: QuestionType[] = ['mcq_single', 'mcq_multi', 'true_false'];
// Only these types are actually auto-graded by the backend — short_answer
// and essay just keep a reference answer for the teacher's own use.
const NOT_AUTO_GRADED: QuestionType[] = ['short_answer', 'essay'];

const PAGE_SIZE = 20;

export function QuestionBankView() {
  const [subjectName, setSubjectName] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSubject = useDebounce(subjectName, 350);
  const debouncedTopic = useDebounce(topic, 350);

  const { data, isLoading, isFetching, isError, refetch } = useGetQuestionsQuery({
    subjectName: debouncedSubject || undefined,
    topic: debouncedTopic || undefined,
    type: type === 'all' ? undefined : (type as QuestionType),
    includeArchived,
    page,
    limit: PAGE_SIZE,
  });

  const questions = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [archiveQuestion] = useArchiveQuestionMutation();
  const [bulkImportQuestions] = useBulkImportQuestionsMutation();

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (q: Question) => { setEditing(q); setFormOpen(true); };

  const handleArchive = async (q: Question) => {
    try {
      await archiveQuestion(q.id).unwrap();
      toast.success('Question archived');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not archive question');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description={isLoading ? 'Loading…' : `${data?.meta?.total ?? questions.length} questions`}
        actions={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={16} /> Import CSV
            </Button>
            <Button size="sm" onClick={openCreate}><Plus size={16} /> Create question</Button>
          </>
        )}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={subjectName}
            onChange={(v) => { setSubjectName(v); setPage(1); }}
            placeholder="Filter by subject…"
            className="sm:w-56"
          />
          <SearchInput
            value={topic}
            onChange={(v) => { setTopic(v); setPage(1); }}
            placeholder="Filter by topic…"
            className="sm:w-56"
          />
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }}
              className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            Include archived
          </label>
        </div>
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertTriangle} title="Couldn't load questions" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : questions.length === 0 ? (
        <Card><EmptyState icon={HelpCircle} title="No questions yet" description="Create a question or bulk-import a CSV to build your bank." action={<Button size="sm" onClick={openCreate}><Plus size={16} /> Create question</Button>} /></Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Question</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-xs">
                      <p className="truncate font-medium text-foreground">{q.text}</p>
                    </TableCell>
                    <TableCell>{q.subjectName}</TableCell>
                    <TableCell>{q.topic ?? '—'}</TableCell>
                    <TableCell><Badge variant="primary">{TYPE_LABEL[q.type]}</Badge></TableCell>
                    <TableCell>{q.marks}</TableCell>
                    <TableCell><UsageCountCell questionId={q.id} /></TableCell>
                    <TableCell>
                      {q.isArchived ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Active</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(q)}>
                          <Pencil size={15} />
                        </Button>
                        {!q.isArchived && (
                          <Button variant="ghost" size="icon" aria-label="Archive" onClick={() => handleArchive(q)}>
                            <Archive size={15} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous">
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <QuestionFormDrawer open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <ImportCsvDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Bulk import questions"
        columns={['subjectName', 'topic', 'type', 'text', 'marks', 'negativeMarks', 'difficulty', 'option1', 'option2', 'option3', 'correctOptions', 'correctAnswer']}
        sample={['Mathematics', 'Algebra', 'mcq_single', 'What is 2 + 2?', '1', '0', 'easy', '3', '4', '5', '2', '']}
        filename="questions-template.csv"
        helpText="For MCQ / true-false questions, list options in the option1..option6 columns and mark correct ones (1-based, comma-separated) in correctOptions — e.g. &quot;2&quot; or &quot;1,3&quot;. For fill-in-the-blank, numeric, or short-answer questions, leave the option columns empty and fill in correctAnswer instead."
        onImport={async (csv) => (await bulkImportQuestions({ csv }).unwrap()).data}
      />
    </div>
  );
}

/** Lazily fetches and displays a single question's usage count. RTK Query
 *  dedupes/caches per-id, so paging through the list re-uses cached values
 *  instead of re-fetching. The backend only exposes usage count via its own
 *  endpoint (list/create/update responses don't include it), so a per-row
 *  fetch is the only way to show it in the table. */
function UsageCountCell({ questionId }: { questionId: string }) {
  const { data, isLoading } = useGetQuestionUsageCountQuery(questionId);
  if (isLoading) return <span className="text-xs text-muted-foreground">…</span>;
  const count = data?.data.usageCount ?? 0;
  return count > 0
    ? <Badge variant="outline">{count} exam{count === 1 ? '' : 's'}</Badge>
    : <span className="text-xs text-muted-foreground">—</span>;
}

const optionSchema = z.object({
  text: z.string().min(1, 'Required'),
  isCorrect: z.boolean(),
});

const schema = z
  .object({
    subjectName: z.string().min(1, 'Required').max(60),
    topic: z.string().max(60).optional(),
    type: z.enum(['mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'essay', 'fill_blank', 'numeric']),
    text: z.string().min(1, 'Required'),
    options: z.array(optionSchema).optional(),
    correctAnswer: z.string().max(2000).optional(),
    marks: z.coerce.number().min(0, '≥ 0'),
    negativeMarks: z.coerce.number().min(0, '≥ 0').optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  })
  .superRefine((d, ctx) => {
    const mcqLike = MCQ_LIKE.includes(d.type);
    if (mcqLike) {
      if (!d.options || d.options.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'At least 2 options are required' });
        return;
      }
      const correctCount = d.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'Mark at least one option correct' });
      }
      if (d.type === 'mcq_single' && correctCount > 1) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'Only one option can be correct for a single-answer MCQ' });
      }
      if (d.type === 'true_false' && d.options.length !== 2) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'True/False must have exactly 2 options' });
      }
    } else if (['fill_blank', 'numeric', 'short_answer'].includes(d.type) && !d.correctAnswer) {
      ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'A reference/correct answer is required' });
    }
  });
type QuestionForm = z.infer<typeof schema>;

const emptyDefaults = (): QuestionForm => ({
  subjectName: '',
  topic: '',
  type: 'mcq_single',
  text: '',
  options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
  correctAnswer: '',
  marks: 1,
  negativeMarks: 0,
  difficulty: undefined,
});

function QuestionFormDrawer({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Question | null }) {
  const [createQuestion, { isLoading: creating }] = useCreateQuestionMutation();
  const [updateQuestion, { isLoading: updating }] = useUpdateQuestionMutation();
  // Skip until the drawer is actually open on an existing question — no
  // point firing this for the "create" flow (there's no id yet).
  const { data: usageRes } = useGetQuestionUsageCountQuery(editing?.id ?? '', { skip: !editing || !open });
  const usageCount = usageRes?.data.usageCount ?? 0;

  const { register, control, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<QuestionForm>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const currentType = watch('type');
  const mcqLike = MCQ_LIKE.includes(currentType);
  const isTrueFalse = currentType === 'true_false';

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        subjectName: editing.subjectName,
        topic: editing.topic ?? '',
        type: editing.type,
        text: editing.text,
        options: editing.options?.length ? editing.options : [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
        correctAnswer: editing.correctAnswer ?? '',
        marks: editing.marks,
        negativeMarks: editing.negativeMarks,
        difficulty: editing.difficulty ?? undefined,
      });
    } else {
      reset(emptyDefaults());
    }
  }, [open, editing, reset]);

  const onSubmit = async (values: QuestionForm) => {
    const body = {
      subjectName: values.subjectName,
      topic: values.topic || undefined,
      type: values.type,
      text: values.text,
      options: mcqLike ? values.options : undefined,
      correctAnswer: mcqLike ? undefined : (values.correctAnswer || undefined),
      marks: values.marks,
      negativeMarks: values.negativeMarks ?? 0,
      difficulty: values.difficulty,
    };
    try {
      if (editing) {
        await updateQuestion({ id: editing.id, body }).unwrap();
        toast.success('Question updated');
      } else {
        await createQuestion(body).unwrap();
        toast.success('Question created');
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save question');
    }
  };

  // mcq_single/true_false are single-correct: selecting one option clears
  // every other option's isCorrect. mcq_multi just toggles the one clicked.
  const selectSingleCorrect = (index: number) => {
    getValues('options')?.forEach((_, i) => setValue(`options.${i}.isCorrect`, i === index));
  };
  const toggleMultiCorrect = (index: number, checked: boolean) => {
    setValue(`options.${index}.isCorrect`, checked);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[520px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{editing ? 'Edit Question' : 'Create Question'}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {editing && usageCount > 0 && (
              <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs text-foreground">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
                <p>
                  This question has been used in {usageCount} exam{usageCount === 1 ? '' : 's'}. Editing it will
                  NOT change those exams&apos; frozen copies or past grading — only future exams that pull from
                  the bank will see this update.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="subjectName">Subject</Label>
                <Input id="subjectName" placeholder="e.g. Mathematics" {...register('subjectName')} />
                {errors.subjectName && <p className="mt-1 text-xs text-danger">{errors.subjectName.message}</p>}
              </div>
              <div>
                <Label htmlFor="topic">Topic (optional)</Label>
                <Input id="topic" placeholder="e.g. Algebra" {...register('topic')} />
              </div>
            </div>

            <div>
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label htmlFor="text">Question text</Label>
              <Textarea id="text" placeholder="Enter the question…" {...register('text')} />
              {errors.text && <p className="mt-1 text-xs text-danger">{errors.text.message}</p>}
            </div>

            {mcqLike ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="mb-0">Options</Label>
                  {!isTrueFalse && (
                    <button
                      type="button"
                      onClick={() => fields.length < 6 && append({ text: '', isCorrect: false })}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus size={13} /> Add option
                    </button>
                  )}
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {currentType === 'mcq_single' || isTrueFalse
                    ? 'Select the one correct option.'
                    : 'Select every correct option.'}
                </p>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <input
                        type={currentType === 'mcq_multi' ? 'checkbox' : 'radio'}
                        name="correct-option"
                        checked={!!watch(`options.${i}.isCorrect`)}
                        onChange={(e) => (currentType === 'mcq_multi' ? toggleMultiCorrect(i, e.target.checked) : selectSingleCorrect(i))}
                        className="h-4 w-4 shrink-0 text-primary"
                      />
                      <Input
                        placeholder={isTrueFalse ? (i === 0 ? 'True' : 'False') : `Option ${i + 1}`}
                        className="flex-1"
                        disabled={isTrueFalse}
                        {...register(`options.${i}.text` as const)}
                      />
                      {!isTrueFalse && (
                        <button
                          type="button"
                          onClick={() => fields.length > 2 && remove(i)}
                          disabled={fields.length <= 2}
                          aria-label="Remove"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.options && <p className="mt-1 text-xs text-danger">{(errors.options as any).message || 'Check options'}</p>}
              </div>
            ) : (
              <div>
                <Label htmlFor="correctAnswer">
                  {NOT_AUTO_GRADED.includes(currentType)
                    ? 'Reference answer — not auto-graded'
                    : 'Correct answer'}
                </Label>
                <Textarea id="correctAnswer" placeholder="Enter the expected answer…" {...register('correctAnswer')} />
                {errors.correctAnswer && <p className="mt-1 text-xs text-danger">{errors.correctAnswer.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="marks">Marks</Label>
                <Input id="marks" type="number" step="0.5" {...register('marks')} />
                {errors.marks && <p className="mt-1 text-xs text-danger">{errors.marks.message}</p>}
              </div>
              <div>
                <Label htmlFor="negativeMarks">Negative marks</Label>
                <Input id="negativeMarks" type="number" step="0.5" {...register('negativeMarks')} />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Controller
                  control={control}
                  name="difficulty"
                  render={({ field }) => (
                    <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={creating || updating}>{editing ? 'Save changes' : 'Create question'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
