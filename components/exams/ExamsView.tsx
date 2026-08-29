'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, FileText, ClipboardList } from 'lucide-react';
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
import { useGetExamsQuery, useCreateExamMutation, type ExamType } from '@/store/api/examsApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import { formatDate } from '@/lib/utils';
import { ResultsEntry } from './ResultsEntry';

const TYPES: { value: ExamType; label: string }[] = [
  { value: 'midterm', label: 'Mid-term' },
  { value: 'final', label: 'Final' },
  { value: 'unit', label: 'Unit test' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'board', label: 'Board' },
];

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

  if (activeExam) {
    return <ResultsEntry examId={activeExam} onBack={() => setActiveExam(null)} />;
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
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{e.type} · {e.className ?? '—'}</p>
                </div>
                {e.published
                  ? <Badge variant="success">Published</Badge>
                  : e.gradedCount > 0
                    ? <Badge variant="primary">Graded</Badge>
                    : <Badge variant="neutral">Pending</Badge>}
              </div>
              <div className="mt-3 flex-1 text-sm text-muted-foreground">
                {e.subjectCount} subjects · {e.totalMarks} marks
                {e.examDate && <span className="block">{formatDate(e.examDate)}</span>}
              </div>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setActiveExam(e.id)}>
                <ClipboardList size={15} /> Enter results
              </Button>
            </Card>
          ))}
        </div>
      )}

      <CreateExamDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

const schema = z.object({
  title: z.string().min(1, 'Required'),
  type: z.enum(['midterm', 'final', 'unit', 'monthly', 'board']),
  classId: z.string().min(1, 'Select a class'),
  examDate: z.string().optional(),
  subjects: z.array(z.object({
    name: z.string().min(1, 'Required'),
    totalMarks: z.coerce.number().int().min(1, '≥ 1'),
  })).min(1, 'Add at least one subject'),
});
type ExamForm = z.infer<typeof schema>;

function CreateExamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [createExam, { isLoading }] = useCreateExamMutation();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ExamForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', type: 'midterm', classId: '', examDate: '',
      subjects: [{ name: 'Mathematics', totalMarks: 100 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'subjects' });

  const onSubmit = async (values: ExamForm) => {
    try {
      await createExam({ ...values, examDate: values.examDate || undefined }).unwrap();
      toast.success('Exam created');
      reset({ title: '', type: 'midterm', classId: '', examDate: '', subjects: [{ name: 'Mathematics', totalMarks: 100 }] });
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not create exam');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Create Exam</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
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
              <Label htmlFor="examDate">Exam date (optional)</Label>
              <input id="examDate" type="date" {...register('examDate')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="mb-0">Subjects</Label>
                <button type="button" onClick={() => append({ name: '', totalMarks: 100 })} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus size={13} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Input placeholder="Subject" className="flex-1" {...register(`subjects.${i}.name` as const)} />
                    <Input type="number" placeholder="Total" className="w-24" {...register(`subjects.${i}.totalMarks` as const)} />
                    <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {errors.subjects && <p className="mt-1 text-xs text-danger">{(errors.subjects as any).message || 'Check subjects'}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Create exam</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
