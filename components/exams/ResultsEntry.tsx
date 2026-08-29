'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Save, CheckCircle2, AlertTriangle, Clock, PauseCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  useGetExamResultsQuery,
  useSaveExamResultsMutation,
  usePublishExamMutation,
  useSetOfficialGradeMutation,
  type ExamGradingScheme,
} from '@/store/api/examsApi';

/**
 * Mirrors backend grading-scheme.model.ts's computeGradeFromConfig() —
 * client-side so the grade cell can preview live as marks are typed,
 * without a round-trip. Must stay behaviorally identical to the backend:
 * same fallbacks (DEFAULT_PERCENTAGE_LETTER_BANDS, default Cambridge
 * bands), same "never throws" guarantee.
 */
const DEFAULT_PERCENTAGE_LETTER_BANDS = [
  { grade: 'A+', minPercent: 90 },
  { grade: 'A', minPercent: 80 },
  { grade: 'B', minPercent: 70 },
  { grade: 'C', minPercent: 60 },
  { grade: 'D', minPercent: 50 },
  { grade: 'E', minPercent: 40 },
  { grade: 'F', minPercent: 0 },
];

const DEFAULT_CAMBRIDGE_BANDS = [
  { grade: 'A*', minPercent: 90 },
  { grade: 'A', minPercent: 80 },
  { grade: 'B', minPercent: 70 },
  { grade: 'C', minPercent: 60 },
  { grade: 'D', minPercent: 50 },
  { grade: 'E', minPercent: 40 },
  { grade: 'U', minPercent: 0 },
];

function pickBand<T extends { minPercent: number }>(bands: T[] | undefined, pct: number): T | undefined {
  if (!bands || bands.length === 0) return undefined;
  const sorted = [...bands].sort((a, b) => b.minPercent - a.minPercent);
  return sorted.find((b) => pct >= b.minPercent) ?? sorted[sorted.length - 1];
}

interface GradeResult {
  grade: string;
  gradePoints?: number;
  isPassed: boolean;
}

function computeGrade(scheme: ExamGradingScheme | null, percentage: number): GradeResult | null {
  if (!scheme) return null;
  const pct = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;

  switch (scheme.type) {
    case 'percentage_letter': {
      const bands = scheme.config?.bands?.length ? scheme.config.bands : DEFAULT_PERCENTAGE_LETTER_BANDS;
      const band = pickBand(bands, pct);
      const grade = band?.grade ?? 'F';
      const sorted = [...bands].sort((a, b) => b.minPercent - a.minPercent);
      const failingGrade = sorted[sorted.length - 1]?.grade;
      return { grade, isPassed: grade !== failingGrade };
    }
    case 'gpa': {
      const table = scheme.config?.gradePoints ?? [];
      const band = pickBand(table, pct);
      const grade = band?.grade ?? 'F';
      const points = band?.points ?? 0;
      const passingPoints = scheme.config?.passingGradePoints ?? 0;
      return { grade, gradePoints: points, isPassed: points >= passingPoints };
    }
    case 'cambridge': {
      const bands = scheme.config?.predictedBands?.length ? scheme.config.predictedBands : DEFAULT_CAMBRIDGE_BANDS;
      const band = pickBand(bands, pct);
      const grade = band?.grade ?? 'U';
      return { grade, isPassed: grade !== 'U' };
    }
    case 'pass_fail': {
      const threshold = scheme.config?.passingPercent ?? 40;
      const isPassed = pct >= threshold;
      return { grade: isPassed ? 'Pass' : 'Fail', isPassed };
    }
    default:
      return { grade: 'N/A', isPassed: false };
  }
}

type MarksState = Record<string, Record<string, string>>; // studentId -> subject -> value
type StatusState = Record<string, 'final' | 'pending'>;

function GradeCell({
  scheme,
  percentage,
  studentId,
  resultId,
  officialGrade,
  status,
  onSetOfficialGrade,
  onTogglePending,
}: {
  scheme: ExamGradingScheme | null;
  percentage: number;
  studentId: string;
  resultId: string | null;
  officialGrade: string | null;
  status: 'final' | 'pending';
  onSetOfficialGrade: (studentId: string, resultId: string, value: string) => void;
  onTogglePending: (studentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(officialGrade ?? '');

  if (!scheme) {
    return <Badge variant="danger">No scheme</Badge>;
  }

  const computed = computeGrade(scheme, percentage);
  if (!computed) return <Badge variant="danger">—</Badge>;

  if (scheme.type === 'gpa') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant={computed.isPassed ? 'success' : 'danger'}>
          {computed.grade} · {(computed.gradePoints ?? 0).toFixed(1)}
        </Badge>
      </div>
    );
  }

  if (scheme.type === 'pass_fail') {
    return <Badge variant={computed.isPassed ? 'success' : 'danger'}>{computed.grade}</Badge>;
  }

  if (scheme.type === 'cambridge') {
    return (
      <div className="flex w-full min-w-[9rem] flex-col items-center gap-2">
        <Badge variant="outline" className="text-muted-foreground">
          Predicted: {computed.grade}
        </Badge>

        <div className="flex w-full flex-col items-center gap-1.5 border-t border-border pt-2">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="e.g. A*"
                className="h-9 w-16 rounded-lg border border-input bg-card text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-9"
                disabled={!resultId || !draft.trim()}
                onClick={() => {
                  if (!resultId) return;
                  onSetOfficialGrade(studentId, resultId, draft.trim());
                  setEditing(false);
                }}
              >
                Save
              </Button>
            </div>
          ) : officialGrade ? (
            <button
              type="button"
              onClick={() => { setDraft(officialGrade); setEditing(true); }}
              className="inline-flex"
              title="Edit official grade"
            >
              <Badge variant="success">Official: {officialGrade}</Badge>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={!resultId}
              className="inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
              title={resultId ? 'Set official grade' : 'Save marks first'}
            >
              <Badge variant="warning" className="cursor-pointer">
                <Clock size={11} /> Awaiting official
              </Badge>
            </button>
          )}
        </div>

        <div className="flex w-full items-center justify-center border-t border-border pt-2">
          <button
            type="button"
            onClick={() => onTogglePending(studentId)}
            title={status === 'pending' ? 'Result is withheld — click to release' : 'Withhold this result from publishing'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              status === 'pending'
                ? 'text-warning hover:bg-warning-soft'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {status === 'pending' ? (
              <PlayCircle size={16} className="shrink-0" />
            ) : (
              <PauseCircle size={16} className="shrink-0" />
            )}
            {status === 'pending' ? 'Withheld' : 'Withhold'}
          </button>
        </div>
      </div>
    );
  }

  // percentage_letter
  return <Badge variant={computed.isPassed ? 'success' : 'danger'}>{computed.grade}</Badge>;
}

export function ResultsEntry({ examId, onBack }: { examId: string; onBack: () => void }) {
  // refetchOnFocus off here too, same reasoning as AttendanceView's roster
  // query: this screen holds unsaved typed marks in local state seeded from
  // this query, and a background refetch that returns genuinely different
  // data (not just a same-data no-op protected by structural sharing) would
  // silently wipe whatever the teacher was mid-typing when they switched
  // tabs and back.
  const { data, isLoading } = useGetExamResultsQuery(examId, { refetchOnFocus: false });
  const [saveResults, { isLoading: saving }] = useSaveExamResultsMutation();
  const [publishExam, { isLoading: publishing }] = usePublishExamMutation();
  const [setOfficialGrade] = useSetOfficialGradeMutation();
  const [marks, setMarks] = useState<MarksState>({});
  const [statuses, setStatuses] = useState<StatusState>({});

  const roster = data?.data;

  // Horizontal-scroll fade cue for the results table: on narrow viewports the
  // table scrolls sideways past the sticky Student column, and without a
  // visual hint it's easy to miss that the Total/%/Grade columns exist
  // offscreen. Mirrors the fade-cue approach used in import-csv-drawer's
  // created-accounts list, adapted to track real scroll position (fades out
  // once fully scrolled) rather than a static row-count heuristic, since the
  // subject-column count varies per exam.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollFade, setShowScrollFade] = useState(false);

  const updateScrollFade = () => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollWidth > el.clientWidth + 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setShowScrollFade(canScroll && !atEnd);
  };

  useEffect(() => {
    updateScrollFade();
    window.addEventListener('resize', updateScrollFade);
    return () => window.removeEventListener('resize', updateScrollFade);
  }, [roster]);

  // Only reseed local marks/statuses when we switch to a genuinely different
  // exam (or on first load). A background refetch of the SAME exam (e.g.
  // triggered by setOfficialGrade invalidating the 'Results' tag) must NOT
  // reseed here, or it would silently wipe any unsaved marks a teacher has
  // typed for other students. We track the last exam id we seeded from in a
  // ref rather than in the effect deps, since `roster` gets a new object
  // reference on every refetch even when the exam id is unchanged.
  const seededExamIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (roster && seededExamIdRef.current !== roster.exam.id) {
      const seed: MarksState = {};
      const seedStatus: StatusState = {};
      roster.students.forEach((s) => {
        seed[s.studentId] = {};
        s.marks.forEach((m) => {
          seed[s.studentId][m.name] = m.obtained === null ? '' : String(m.obtained);
        });
        seedStatus[s.studentId] = s.status === 'pending' ? 'pending' : 'final';
      });
      setMarks(seed);
      setStatuses(seedStatus);
      seededExamIdRef.current = roster.exam.id;
    }
  }, [roster]);

  if (isLoading || !roster) {
    return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  }

  const { exam, students } = roster;
  const scheme = exam.gradingScheme;

  const setMark = (studentId: string, subject: string, value: string, max: number) => {
    let v = value.replace(/[^0-9.]/g, '');
    if (v !== '' && Number(v) > max) v = String(max);
    setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [subject]: v } }));
  };

  const togglePending = (studentId: string) => {
    setStatuses((prev) => ({ ...prev, [studentId]: prev[studentId] === 'pending' ? 'final' : 'pending' }));
  };

  const handleSetOfficialGrade = async (studentId: string, resultId: string, value: string) => {
    try {
      await setOfficialGrade({ resultId, officialGrade: value }).unwrap();
      toast.success('Official grade recorded');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not record official grade');
    }
  };

  const rowTotal = (studentId: string) => {
    const row = marks[studentId] || {};
    return exam.subjects.reduce((sum, s) => sum + (Number(row[s.name]) || 0), 0);
  };

  const save = async () => {
    const records = students.map((s) => ({
      studentId: s.studentId,
      marks: exam.subjects.map((sub) => ({
        name: sub.name,
        obtained: Number(marks[s.studentId]?.[sub.name]) || 0,
      })),
      status: statuses[s.studentId] ?? 'final',
    }));
    try {
      await saveResults({ examId, records }).unwrap();
      toast.success('Results saved');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save results');
    }
  };

  const publish = async () => {
    try {
      await publishExam(examId).unwrap();
      toast.success('Results published to students');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not publish');
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
            <h2 className="text-lg font-bold text-foreground">{exam.title}</h2>
            <p className="text-xs text-muted-foreground">
              {exam.className} · {exam.totalMarks} total marks
              {scheme && <span className="ml-1">· {scheme.name} scheme</span>}
              {exam.published && <span className="ml-1 text-success">· Published</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" loading={saving} onClick={save}>
            <Save size={16} /> Save
          </Button>
          <Button size="sm" loading={publishing} onClick={publish} disabled={exam.published}>
            {exam.published ? <><CheckCircle2 size={16} /> Published</> : <><Send size={16} /> Publish</>}
          </Button>
        </div>
      </div>

      {!scheme && (
        <Card className="flex items-center gap-2 border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          <AlertTriangle size={16} className="shrink-0" />
          No grading scheme is configured for this institution/class. Marks can still be entered, but grades
          cannot be computed until a grading scheme is set up in Settings.
        </Card>
      )}

      {students.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No students in this class/section yet.
        </Card>
      ) : (
        <div className="relative">
          <TableWrapper ref={scrollRef} onScroll={updateScrollFade}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 bg-muted/50">Student</TableHead>
                {exam.subjects.map((s) => (
                  <TableHead key={s.name} className="text-center">
                    {s.name}
                    <span className="block font-normal normal-case text-muted-foreground">/{s.totalMarks}</span>
                  </TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const total = rowTotal(s.studentId);
                const pct = exam.totalMarks ? Math.round((total / exam.totalMarks) * 1000) / 10 : 0;
                const rowStatus = statuses[s.studentId] ?? 'final';
                return (
                  <TableRow key={s.studentId}>
                    <TableCell className="sticky left-0 bg-card">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.rollNumber}</p>
                      {rowStatus === 'pending' && (
                        <Badge variant="warning" className="mt-1">
                          <Clock size={10} /> Withheld
                        </Badge>
                      )}
                    </TableCell>
                    {exam.subjects.map((sub) => (
                      <TableCell key={sub.name} className="text-center">
                        <input
                          inputMode="numeric"
                          value={marks[s.studentId]?.[sub.name] ?? ''}
                          onChange={(e) => setMark(s.studentId, sub.name, e.target.value, sub.totalMarks)}
                          className="h-9 w-16 rounded-lg border border-input bg-card text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-medium text-foreground">{total}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{pct}%</TableCell>
                    <TableCell className="text-center">
                      <GradeCell
                        scheme={scheme}
                        percentage={pct}
                        studentId={s.studentId}
                        resultId={s.resultId}
                        officialGrade={s.officialGrade}
                        status={rowStatus}
                        onSetOfficialGrade={handleSetOfficialGrade}
                        onTogglePending={togglePending}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableWrapper>
          {showScrollFade && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-card to-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
