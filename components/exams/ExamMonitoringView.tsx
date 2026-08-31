'use client';

import { memo, useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, ClipboardCheck, Send, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import {
  useListAttemptsForExamQuery,
  usePublishAttemptResultMutation,
  type AttemptListItem,
  type AttemptStatus,
} from '@/store/api/examAttemptApi';
import { useGetExamAnalysisQuery } from '@/store/api/examsApi';
import { AttemptGradingView } from './AttemptGradingView';
import toast from 'react-hot-toast';

// Polling every 15-20s so a teacher watching an ongoing online exam sees
// students submit / trip integrity flags without manually refreshing —
// no other view in this codebase currently polls, so this is the first
// pollingInterval usage; matches RTK Query's standard option name/units
// (milliseconds).
const MONITORING_POLL_MS = 15000;

function statusBadge(status: AttemptStatus) {
  switch (status) {
    case 'in_progress':
      return <Badge variant="neutral">In progress</Badge>;
    case 'submitted':
      return <Badge variant="neutral">Submitted</Badge>;
    case 'auto_graded':
      return <Badge variant="primary">Auto-graded</Badge>;
    case 'needs_review':
      return <Badge variant="warning">Needs review</Badge>;
    case 'graded':
      return <Badge variant="primary">Graded</Badge>;
    case 'published':
      return <Badge variant="success">Published</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function ExamMonitoringView({ examId, onBack }: { examId: string; onBack: () => void }) {
  const { data, isLoading } = useListAttemptsForExamQuery(examId, { pollingInterval: MONITORING_POLL_MS });
  const [gradingAttemptId, setGradingAttemptId] = useState<string | null>(null);

  const roster = data?.data;

  if (gradingAttemptId) {
    return (
      <AttemptGradingView
        attemptId={gradingAttemptId}
        examId={examId}
        onBack={() => setGradingAttemptId(null)}
      />
    );
  }

  if (isLoading || !roster) {
    return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  }

  const { exam, attempts } = roster;
  const startedCount = attempts.filter((a) => a.status === 'in_progress').length;
  const submittedCount = attempts.filter((a) => a.status !== 'in_progress').length;
  const flaggedCount = attempts.filter((a) => a.integrityFlagCount > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">{exam.title}</h2>
            <p className="text-xs text-muted-foreground">
              {exam.subjectName ?? '—'} · {attempts.length} students
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="neutral">{startedCount} in progress</Badge>
          <Badge variant="primary">{submittedCount} submitted</Badge>
          {flaggedCount > 0 && <Badge variant="danger"><AlertTriangle size={11} /> {flaggedCount} flagged</Badge>}
        </div>
      </div>

      <ExamAnalysisCard examId={examId} />

      {attempts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No student has started this exam yet.
        </Card>
      ) : (
        <Card>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-center">Awarded</TableHead>
                  <TableHead className="text-center">Integrity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <AttemptRow
                    key={a.attemptId}
                    attempt={a}
                    examId={examId}
                    onGrade={() => setGradingAttemptId(a.attemptId)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </Card>
      )}
    </div>
  );
}

const AttemptRow = memo(function AttemptRow({
  attempt, examId, onGrade,
}: {
  attempt: AttemptListItem;
  examId: string;
  onGrade: () => void;
}) {
  // Each row owns its own mutation instance — a single shared hook at the
  // parent level would disable/spin EVERY row's Publish button the moment
  // any one of them was clicked, since they'd all share the same isLoading
  // flag.
  const [publishAttemptResult, { isLoading: publishing }] = usePublishAttemptResultMutation();
  // Synchronous guard against a double-click landing two requests before
  // React re-renders with the mutation's isLoading flag — the `disabled`
  // prop alone depends on a render happening first.
  const publishingRef = useRef(false);

  const canGrade = attempt.status === 'needs_review' || attempt.status === 'graded';
  const canPublish = attempt.status === 'auto_graded' || attempt.status === 'graded';

  const flagTitle = attempt.integrityFlags
    .map((f) => `${f.type.replace('_', ' ')} — ${formatDate(f.at)}`)
    .join('\n');

  const onPublish = async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    try {
      await publishAttemptResult({ attemptId: attempt.attemptId, examId }).unwrap();
      toast.success('Result published to student');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not publish result');
    } finally {
      publishingRef.current = false;
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">{attempt.studentName}</TableCell>
      <TableCell>{statusBadge(attempt.status)}</TableCell>
      <TableCell className="text-muted-foreground">
        {attempt.submittedAt ? formatDate(attempt.submittedAt) : '—'}
        {attempt.autoSubmitted && <span className="ml-1 text-xs text-warning">(auto)</span>}
      </TableCell>
      <TableCell className="text-center">{attempt.totalAwarded ?? '—'}</TableCell>
      <TableCell className="text-center">
        {attempt.integrityFlagCount > 0 ? (
          <span title={flagTitle}>
            <Badge variant="danger">{attempt.integrityFlagCount}</Badge>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canGrade && (
          <Button size="sm" variant="secondary" onClick={onGrade}>
            <ClipboardCheck size={14} /> Grade
          </Button>
        )}
        {!canGrade && canPublish && (
          <Button size="sm" loading={publishing} onClick={onPublish}>
            <Send size={14} /> Publish
          </Button>
        )}
        {!canGrade && !canPublish && <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    </TableRow>
  );
});

// Class-average / item-analysis summary — fetched separately from the
// attempts roster so a slow aggregation query never blocks the roster table
// from rendering. Silently renders nothing on error/empty (e.g. no
// submissions yet) rather than showing a scary error card on a routine view.
function ExamAnalysisCard({ examId }: { examId: string }) {
  const { data, isLoading } = useGetExamAnalysisQuery(examId);
  const [expanded, setExpanded] = useState(false);
  const analysis = data?.data;

  if (isLoading) {
    return <Card className="p-4"><Skeleton className="h-16 w-full" /></Card>;
  }
  if (!analysis || analysis.totalAttempts === 0) {
    return null;
  }

  const { overall, perQuestion } = analysis;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 size={16} /> Class analysis
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="neutral">{analysis.totalAttempts} submitted</Badge>
          <Badge variant="primary">Avg {overall.average}</Badge>
          <Badge variant="outline">Median {overall.median}</Badge>
          <Badge variant="success">High {overall.highest}</Badge>
          <Badge variant="danger">Low {overall.lowest}</Badge>
        </div>
      </div>

      {perQuestion.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide per-question breakdown' : 'Show per-question breakdown'}
          </button>

          {expanded && (
            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Question</TableHead>
                    <TableHead className="text-center">Answered</TableHead>
                    <TableHead className="text-center">Full marks %</TableHead>
                    <TableHead className="text-center">Zero %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perQuestion.map((q) => (
                    <TableRow key={q.questionIndex}>
                      <TableCell>Q{q.questionIndex + 1}</TableCell>
                      <TableCell className="text-center">{q.totalAnswered}</TableCell>
                      <TableCell className="text-center">{q.fullMarksPercent}%</TableCell>
                      <TableCell className="text-center">{q.zeroPercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
