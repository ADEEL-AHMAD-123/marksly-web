'use client';

import Link from 'next/link';
import { FileText, CalendarDays, ArrowRight, CheckCircle2, Laptop, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyClassesQuery } from '@/store/api/portalApi';
import { useGetExamsQuery } from '@/store/api/examsApi';
import { useTeacherExamAttentionQuery } from '@/store/api/examAttemptApi';

const UPCOMING_WINDOW_DAYS = 14;

/**
 * getExams isn't teacher-scoped server-side (it returns every exam in the
 * institution, filterable only by a single classId/termId) — so this widget
 * scopes it client-side to the classes the teacher actually teaches (from
 * myClasses), rather than adding a backend filter for what's otherwise a
 * small dashboard card. Three buckets: online-exam attempts needing
 * grading/publishing (see below — this is DISTINCT from the physical-exam
 * "awaiting publish" bucket, since an online exam's own `published` flag
 * never flips true, only each attempt's own Result does — so it would
 * never show up in the physical-exam check otherwise), physical exams
 * still awaiting publish, and exams coming up soon (heads-up).
 */
export function TeacherDashboardExamsQueue() {
  const { data: classesRes, isLoading: classesLoading } = useMyClassesQuery();
  const myClassIds = new Set((classesRes?.data ?? []).map((c) => c.id));

  const { data: examsRes, isLoading: examsLoading } = useGetExamsQuery();
  const { data: attentionRes, isLoading: attentionLoading } = useTeacherExamAttentionQuery();
  const isLoading = classesLoading || examsLoading || attentionLoading;

  if (isLoading) return <Card className="p-5"><Skeleton className="h-28 w-full" /></Card>;
  if (myClassIds.size === 0) return null;

  const myExams = (examsRes?.data ?? []).filter((e) => e.classId && myClassIds.has(e.classId));
  const needsPublish = myExams.filter((e) => e.status === 'completed' && !e.published);
  const onlineAttention = attentionRes?.data ?? [];
  const now = Date.now();
  const upcoming = myExams
    .filter((e) => e.examDate && new Date(e.examDate).getTime() >= now && new Date(e.examDate).getTime() <= now + UPCOMING_WINDOW_DAYS * 86_400_000)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());

  if (needsPublish.length === 0 && onlineAttention.length === 0 && upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText size={18} /> Exams</CardTitle>
        <CardDescription>Grading, results to publish, and what's coming up.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {onlineAttention.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
              <Laptop size={12} /> Online exams need you
            </p>
            <div className="space-y-2">
              {onlineAttention.slice(0, 3).map((e) => (
                <div key={e.examId} className="flex items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.className ?? '—'}
                      {e.needsReview > 0 && ` · ${e.needsReview} need grading`}
                      {e.readyToPublish > 0 && ` · ${e.readyToPublish} ready to publish`}
                    </p>
                  </div>
                  <Link href={`/teacher/exams?examId=${e.examId}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    <ClipboardCheck size={14} /> Review
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {needsPublish.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
              Awaiting publish ({needsPublish.length})
            </p>
            <div className="space-y-2">
              {needsPublish.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.className} · {e.gradedCount}/{e.subjectCount} subjects graded</p>
                  </div>
                  <Link href={`/teacher/exams?examId=${e.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    Review <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays size={12} /> Coming up
            </p>
            <ul className="divide-y divide-border">
              {upcoming.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">{e.title} — {e.className}</span>
                  <Badge variant="neutral">{new Date(e.examDate!).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {needsPublish.length === 0 && onlineAttention.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={13} className="text-success" /> Nothing awaiting publish right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
