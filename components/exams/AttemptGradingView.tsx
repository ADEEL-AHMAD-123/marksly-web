'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  useGetAttemptForGradingQuery,
  useGradeManualAnswerMutation,
  usePublishAttemptResultMutation,
  type GradingQuestion,
} from '@/store/api/examAttemptApi';

function responseToText(response: string | string[] | null, options?: { text: string; isCorrect: boolean }[]): string {
  if (response == null || response === '') return '(no answer)';
  const values = Array.isArray(response) ? response : [response];
  if (options && options.length > 0) {
    return values.map((v) => options[Number(v)]?.text ?? v).join(', ');
  }
  return values.join(', ');
}

function QuestionCard({
  question, examId, attemptId,
}: {
  question: GradingQuestion;
  examId: string;
  attemptId: string;
}) {
  const [gradeManualAnswer, { isLoading: saving }] = useGradeManualAnswerMutation();
  const [draft, setDraft] = useState(question.awardedMarks != null ? String(question.awardedMarks) : '');
  // Synchronous guard so two very fast clicks (same event-loop tick, before
  // React re-renders with the mutation's isLoading flag) can't both fire.
  const savingRef = useRef(false);

  useEffect(() => {
    setDraft(question.awardedMarks != null ? String(question.awardedMarks) : '');
  }, [question.awardedMarks]);

  const isManual = question.isManuallyGraded;

  const saveGrade = async () => {
    if (savingRef.current) return;
    const marks = Number(draft);
    if (Number.isNaN(marks) || marks < 0 || marks > question.marks) {
      toast.error(`Marks must be between 0 and ${question.marks}`);
      return;
    }
    savingRef.current = true;
    try {
      await gradeManualAnswer({ attemptId, examId, questionIndex: question.questionIndex, marks }).unwrap();
      toast.success('Grade saved');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save grade');
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Q{question.questionIndex + 1} · {question.type.replace('_', ' ')} · {question.marks} pt
            {question.negativeMarks > 0 && <span> · -{question.negativeMarks} penalty</span>}
          </p>
          <p className="mt-1 font-medium text-foreground">{question.text}</p>
        </div>
        {isManual ? (
          <Badge variant={question.awardedMarks != null ? 'success' : 'warning'}>
            {question.awardedMarks != null ? 'Graded' : 'Needs grading'}
          </Badge>
        ) : (
          <Badge variant="neutral">Auto-graded</Badge>
        )}
      </div>

      {question.options && question.options.length > 0 && (
        <div className="space-y-1">
          {question.options.map((o, i) => (
            <div
              key={i}
              className={`rounded-md border px-2 py-1 text-sm ${o.isCorrect ? 'border-success/40 bg-success-soft text-success' : 'border-border text-foreground'}`}
            >
              {o.text}{o.isCorrect && <span className="ml-1 text-xs">(correct)</span>}
            </div>
          ))}
        </div>
      )}

      {question.correctAnswer && (!question.options || question.options.length === 0) && (
        <p className="text-sm text-muted-foreground">
          Correct answer: <span className="font-medium text-success">{question.correctAnswer}</span>
        </p>
      )}

      <div className="rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground">
        <p className="mb-0.5 text-xs text-muted-foreground">Student's answer</p>
        {responseToText(question.studentResponse, question.options)}
      </div>

      {isManual ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={question.marks}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-9 w-24 rounded-lg border border-input bg-card px-2 text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground">/ {question.marks}</span>
          <Button size="sm" variant="secondary" loading={saving} onClick={saveGrade}>
            <Save size={14} /> Save grade
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Awarded: {question.awardedMarks ?? 0} / {question.marks}</p>
      )}
    </Card>
  );
}

export function AttemptGradingView({
  attemptId, examId, onBack,
}: {
  attemptId: string;
  examId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useGetAttemptForGradingQuery(attemptId);
  const [publishAttemptResult, { isLoading: publishing }] = usePublishAttemptResultMutation();
  const publishingRef = useRef(false);

  if (isLoading || !data) {
    return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  }

  const { attempt, exam, questions } = data.data;
  const allGraded = questions.every((q) => q.awardedMarks !== null);
  const readyToPublish = allGraded && (attempt.status === 'graded' || attempt.status === 'auto_graded');

  const publish = async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    try {
      await publishAttemptResult({ attemptId, examId }).unwrap();
      toast.success('Result published to student');
      onBack();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not publish result');
    } finally {
      publishingRef.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">{attempt.studentName}</h2>
            <p className="text-xs text-muted-foreground">
              {exam.title} · Attempt #{attempt.attemptNumber} · Submitted {attempt.submittedAt ? formatDate(attempt.submittedAt) : '—'}
            </p>
          </div>
        </div>
        <div className="text-sm font-medium text-foreground">Total: {attempt.totalAwarded}</div>
      </div>

      {attempt.integrityFlags.length > 0 && (
        <Card className="border-warning/40 bg-warning-soft p-3 text-sm text-warning">
          {attempt.integrityFlags.length} integrity flag(s): {attempt.integrityFlags.map((f) => f.type.replace('_', ' ')).join(', ')}
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionCard key={q.questionIndex} question={q} examId={examId} attemptId={attemptId} />
        ))}
      </div>

      {readyToPublish ? (
        <Card className="flex items-center justify-between gap-3 border-success/40 bg-success-soft p-4">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">All questions graded — ready to publish</span>
          </div>
          <Button size="sm" loading={publishing} onClick={publish}>
            <Send size={14} /> Publish result
          </Button>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">
          Grade every question above before publishing this result.
        </Card>
      )}
    </div>
  );
}
