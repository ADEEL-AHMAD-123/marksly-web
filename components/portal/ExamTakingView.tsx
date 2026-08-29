'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useGetMyAttemptStateQuery,
  useStartAttemptMutation,
  useSaveAnswerMutation,
  useLogIntegrityFlagMutation,
  useSubmitAttemptMutation,
  type AttemptQuestion,
} from '@/store/api/examAttemptApi';

const AUTOSAVE_DELAY_MS = 800;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// `clockOffsetMs` = serverTime - Date.now(), computed once when the server
// response arrives — `Date.now() + clockOffsetMs` approximates the SERVER's
// current time regardless of how wrong the device's own clock is. Without
// this, a fast client clock would auto-submit early, and a slow one would
// show a positive countdown even after the server's own deadline has
// already passed (which the server enforces independently at submit time).
function useCountdown(deadline: number | null, clockOffsetMs: number) {
  const now = () => Date.now() + clockOffsetMs;
  const [remainingMs, setRemainingMs] = useState<number | null>(deadline == null ? null : deadline - now());

  useEffect(() => {
    if (deadline == null) {
      setRemainingMs(null);
      return;
    }
    setRemainingMs(deadline - now());
    const id = setInterval(() => setRemainingMs(deadline - now()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, clockOffsetMs]);

  return remainingMs;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function normalizeResponse(type: AttemptQuestion['type'], response: string | string[] | undefined): string | string[] {
  if (type === 'mcq_multi') return Array.isArray(response) ? response : response ? [response] : [];
  return Array.isArray(response) ? (response[0] ?? '') : (response ?? '');
}

export function ExamTakingView({ examId }: { examId: string }) {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useGetMyAttemptStateQuery(examId);
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();
  const [saveAnswer] = useSaveAnswerMutation();
  const [logIntegrityFlag] = useLogIntegrityFlagMutation();
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitAttemptMutation();

  const state = data?.data;
  const attempt = state?.attempt ?? null;
  const exam = state?.exam;
  const questions = useMemo(() => state?.questions ?? [], [state]);

  // ─── Local answer state (source of truth while the attempt is open) ─────
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [saveStatuses, setSaveStatuses] = useState<Record<number, SaveStatus>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [completion, setCompletion] = useState<{ timedOut: boolean } | null>(null);
  const [integrityBanner, setIntegrityBanner] = useState<string | null>(null);

  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const latestValues = useRef<Record<number, string | string[]>>({});
  const autoSubmitFired = useRef(false);
  // Serializes autosave requests PER QUESTION — without this, if a save for
  // question N is already in flight when a newer edit to the SAME question
  // fires another save, network jitter could let the older request's
  // response land last and silently overwrite the newer value with no
  // error. Each entry is a promise chain: a new save for question N always
  // waits for the previous in-flight save for question N to settle first.
  const saveChains = useRef<Record<number, Promise<unknown>>>({});
  const [submitFailed, setSubmitFailed] = useState(false);
  const submitInFlight = useRef(false);

  // Pre-fill answers whenever the server attempt state arrives (initial load
  // / resume-on-refresh — see spec's "Resume" requirement).
  useEffect(() => {
    if (!attempt) return;
    const prefilled: Record<number, string | string[]> = {};
    for (const a of attempt.answers) prefilled[a.questionIndex] = a.response;
    setAnswers(prefilled);
    latestValues.current = { ...prefilled };
  }, [attempt?.id]);

  // Clock-skew offset — computed once per fresh server response (not on
  // every render), so the countdown ticks off an approximated SERVER clock
  // rather than trusting the device's own, possibly-wrong, clock.
  const clockOffsetRef = useRef(0);
  useEffect(() => {
    if (state?.serverTime) {
      clockOffsetRef.current = new Date(state.serverTime).getTime() - Date.now();
    }
  }, [state?.serverTime]);

  // ─── Timer — computed from the SERVER's startedAt, not a client-local
  // fresh clock, so a resume after refresh keeps counting down correctly. ──
  const deadline = useMemo(() => {
    if (!attempt || !exam) return null;
    const byDuration = new Date(attempt.startedAt).getTime() + exam.durationMinutes * 60_000;
    const byWindow = exam.windowEnd ? new Date(exam.windowEnd).getTime() : Infinity;
    return Math.min(byDuration, byWindow);
  }, [attempt, exam]);

  const remainingMs = useCountdown(attempt?.status === 'in_progress' ? deadline : null, clockOffsetRef.current);

  // Submits with a few automatic retries on failure — never silently shows
  // a "completed" screen unless the server actually confirmed the
  // submission. On repeated failure, keeps the student on the test screen
  // (fullscreen intact) with a persistent, dismiss-proof retry banner
  // instead of lying about completion.
  const doSubmit = useCallback(
    async (autoSubmitted: boolean, attempts = 0) => {
      if (!attempt) return;
      if (submitInFlight.current) return;
      submitInFlight.current = true;
      try {
        await submitAttempt({ attemptId: attempt.id, examId, autoSubmitted }).unwrap();
        setSubmitFailed(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setCompletion({ timedOut: autoSubmitted });
      } catch {
        if (attempts < 4) {
          const delay = Math.min(2000 * 2 ** attempts, 15_000);
          submitInFlight.current = false;
          setTimeout(() => doSubmit(autoSubmitted, attempts + 1), delay);
        } else {
          // Out of automatic retries — surface a persistent banner with a
          // manual retry action rather than continuing to fail silently.
          setSubmitFailed(true);
        }
      } finally {
        submitInFlight.current = false;
      }
    },
    [attempt, examId, submitAttempt]
  );

  // Auto-submit when the clock runs out.
  useEffect(() => {
    if (attempt?.status !== 'in_progress') return;
    if (remainingMs == null) return;
    if (remainingMs > 0) {
      autoSubmitFired.current = false;
      return;
    }
    if (autoSubmitFired.current) return;
    autoSubmitFired.current = true;
    doSubmit(true);
  }, [remainingMs, attempt?.status, doSubmit]);

  // Best-effort warning against losing an unsaved edit by closing the tab —
  // browsers restrict custom messages, but the native confirmation is still
  // meaningfully better than silently losing work mid-attempt.
  useEffect(() => {
    if (attempt?.status !== 'in_progress') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [attempt?.status]);

  // ─── Integrity tracking ──────────────────────────────────────────────
  const integrityMode = exam?.integrityMode ?? 'none';
  const attemptId = attempt?.id;
  const isInProgress = attempt?.status === 'in_progress';

  const requestFullscreenIfNeeded = useCallback(() => {
    if (integrityMode !== 'fullscreen_lock') return;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Best-effort — browsers may reject a non-gesture-triggered request;
        // never blocks the exam.
      });
    }
  }, [integrityMode]);

  // Resume: request fullscreen immediately if already in_progress on load.
  useEffect(() => {
    if (isInProgress) requestFullscreenIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInProgress]);

  useEffect(() => {
    if (!isInProgress || integrityMode === 'none' || !attemptId) return;

    const onFullscreenChange = () => {
      if (integrityMode === 'fullscreen_lock' && !document.fullscreenElement) {
        logIntegrityFlag({ attemptId, type: 'fullscreen_exit' }).catch(() => {});
        setIntegrityBanner('You left fullscreen mode. Please return to fullscreen to continue your exam.');
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        logIntegrityFlag({ attemptId, type: 'tab_blur' }).catch(() => {});
        if (integrityMode === 'flag_only') {
          setIntegrityBanner('Switching tabs during this exam is being recorded.');
        }
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isInProgress, integrityMode, attemptId, logIntegrityFlag]);

  // ─── Autosave (debounced per-question, serialized per-question, retries
  // on failure) ──────────────────────────────────────────────────────────
  const persistAnswer = useCallback(
    (questionIndex: number, value: string | string[]) => {
      if (!attemptId) return;
      setSaveStatuses((s) => ({ ...s, [questionIndex]: 'saving' }));

      const run = () =>
        saveAnswer({ attemptId, questionIndex, response: value })
          .unwrap()
          .then(() => {
            // Only mark "saved" if this is still the latest value for the
            // question — an even-newer edit already queued its own save.
            if (latestValues.current[questionIndex] === value) {
              setSaveStatuses((s) => ({ ...s, [questionIndex]: 'saved' }));
            }
          })
          .catch(() => {
            setSaveStatuses((s) => ({ ...s, [questionIndex]: 'error' }));
            // Retry the latest known value for this question — never drops
            // the student's edit.
            saveTimers.current[questionIndex] = setTimeout(() => {
              persistAnswer(questionIndex, latestValues.current[questionIndex]);
            }, 2000);
          });

      // Chain onto any still-in-flight save for the SAME question so
      // requests for one question always land in the order they were
      // initiated — otherwise network jitter could let an older in-flight
      // save's response arrive after a newer one, silently overwriting the
      // newer answer on the server with no error surfaced anywhere.
      const previous = saveChains.current[questionIndex] ?? Promise.resolve();
      const chained = previous.then(run, run);
      saveChains.current[questionIndex] = chained;
    },
    [attemptId, saveAnswer]
  );

  const handleAnswerChange = useCallback(
    (questionIndex: number, value: string | string[]) => {
      setAnswers((a) => ({ ...a, [questionIndex]: value }));
      latestValues.current[questionIndex] = value;
      if (saveTimers.current[questionIndex]) clearTimeout(saveTimers.current[questionIndex]);
      saveTimers.current[questionIndex] = setTimeout(() => {
        persistAnswer(questionIndex, value);
      }, AUTOSAVE_DELAY_MS);
    },
    [persistAnswer]
  );

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────
  // Render states
  // ───────────────────────────────────────────────────────────────────

  if (isLoading || !state || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Completion screen (either just submitted this session, or a prior
  // status the student is revisiting).
  if (completion || (attempt && attempt.status !== 'in_progress')) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="text-2xl font-semibold text-foreground">
          {completion?.timedOut ? "Time's up — your exam was submitted" : "You've already completed this exam"}
        </h1>
        <p className="text-muted-foreground">
          {exam.title}
          {exam.subjectName ? ` · ${exam.subjectName}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">
          Your answers have been recorded. Your teacher will review and publish your result in due course.
        </p>
        <Button onClick={() => router.push('/student/exams')}>Back to Online Exams</Button>
      </div>
    );
  }

  // Not started yet.
  if (!attempt) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Ready to begin?</h1>
        <Card className="w-full text-left">
          <CardContent className="space-y-3 p-5">
            <p className="text-lg font-medium text-foreground">{exam.title}</p>
            {exam.subjectName && <p className="text-sm text-muted-foreground">{exam.subjectName}</p>}
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Duration: {exam.durationMinutes} minutes</li>
              <li>Questions: {questions.length}</li>
              <li>Max attempts: {exam.maxAttempts}</li>
            </ul>
            {exam.integrityMode === 'fullscreen_lock' && (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>This exam requires fullscreen mode — you&apos;ll be asked to enter it when you start.</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Button
          size="lg"
          loading={isStarting}
          onClick={async () => {
            await startAttempt(examId).unwrap();
            requestFullscreenIfNeeded();
            refetch();
          }}
        >
          Start exam
        </Button>
      </div>
    );
  }

  // ─── In-progress test UI ──────────────────────────────────────────────
  const answeredCount = questions.filter((q) => {
    const v = answers[q.questionIndex];
    return v != null && (Array.isArray(v) ? v.length > 0 : v !== '');
  }).length;

  const currentQuestion = questions[currentIdx];
  const currentValue = normalizeResponse(currentQuestion.type, answers[currentQuestion.questionIndex]);
  const currentStatus = saveStatuses[currentQuestion.questionIndex] ?? 'idle';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {submitFailed && (
        <div className="flex flex-col items-center justify-between gap-2 bg-danger px-4 py-2 text-sm text-danger-foreground sm:flex-row">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Couldn&apos;t submit your exam — check your connection and try again. Your answers are safe and still saved.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-danger-foreground/40 text-danger-foreground hover:bg-danger-foreground/10"
            onClick={() => {
              setSubmitFailed(false);
              doSubmit(autoSubmitFired.current);
            }}
          >
            Retry submit
          </Button>
        </div>
      )}
      {integrityBanner && (
        <div className="flex items-center justify-between gap-3 bg-warning px-4 py-2 text-sm text-warning-foreground">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {integrityBanner}
          </span>
          <button className="underline" onClick={() => setIntegrityBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-base font-semibold text-foreground sm:text-lg">{exam.title}</h1>
          <p className="text-xs text-muted-foreground">{exam.subjectName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div
            role="timer"
            aria-live={remainingMs != null && remainingMs < 60_000 ? 'assertive' : 'polite'}
            aria-label={remainingMs != null ? `${formatDuration(remainingMs)} remaining` : 'Loading time remaining'}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium tabular-nums',
              remainingMs != null && remainingMs < 60_000 ? 'bg-danger/10 text-danger' : 'bg-muted text-foreground'
            )}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {remainingMs != null ? formatDuration(remainingMs) : '--:--'}
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowSubmitConfirm(true)}>
            Submit exam
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3 sm:px-6">
        {questions.map((q, i) => {
          const v = answers[q.questionIndex];
          const answered = v != null && (Array.isArray(v) ? v.length > 0 : v !== '');
          return (
            <button
              key={q.questionIndex}
              onClick={() => setCurrentIdx(i)}
              aria-current={i === currentIdx ? 'true' : undefined}
              aria-label={`Question ${i + 1}, ${answered ? 'answered' : 'not answered'}${i === currentIdx ? ', current question' : ''}`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                i === currentIdx
                  ? 'border-primary bg-primary text-primary-foreground'
                  : answered
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border bg-card text-muted-foreground'
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Question {currentIdx + 1} of {questions.length} · {currentQuestion.marks} mark
                  {currentQuestion.marks === 1 ? '' : 's'}
                  {currentQuestion.negativeMarks ? ` · -${currentQuestion.negativeMarks} if wrong` : ''}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-base text-foreground">{currentQuestion.text}</p>
              </div>
              <SaveIndicator status={currentStatus} />
            </div>

            <QuestionInput
              question={currentQuestion}
              value={currentValue}
              onChange={(v) => handleAnswerChange(currentQuestion.questionIndex, v)}
            />
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentIdx === questions.length - 1}
            onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
          >
            Next
          </Button>
        </div>
      </main>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-foreground">Submit exam?</h2>
              <p className="text-sm text-muted-foreground">
                You&apos;ve answered {answeredCount} of {questions.length} questions. Submit anyway?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  Keep working
                </Button>
                <Button
                  variant="danger"
                  loading={isSubmitting}
                  onClick={async () => {
                    setShowSubmitConfirm(false);
                    await doSubmit(false);
                  }}
                >
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  if (status === 'saving') return <span className="shrink-0 text-xs text-muted-foreground">Saving…</span>;
  if (status === 'error') return <span className="shrink-0 text-xs text-danger">Save failed — retrying</span>;
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-success">
      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
    </span>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: AttemptQuestion;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  switch (question.type) {
    case 'mcq_single':
    case 'true_false': {
      const selected = Array.isArray(value) ? value[0] : value;
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <label
              key={opt.optionIndex}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                String(selected) === String(opt.optionIndex) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              )}
            >
              <input
                type="radio"
                className="h-4 w-4"
                name={`q-${question.questionIndex}`}
                checked={String(selected) === String(opt.optionIndex)}
                onChange={() => onChange(String(opt.optionIndex))}
              />
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      );
    }
    case 'mcq_multi': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const checked = selected.some((s) => String(s) === String(opt.optionIndex));
            return (
              <label
                key={opt.optionIndex}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                  checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, String(opt.optionIndex)]
                      : selected.filter((s) => String(s) !== String(opt.optionIndex));
                    onChange(next);
                  }}
                />
                <span>{opt.text}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case 'numeric':
      return (
        <input
          type="number"
          className="flex h-11 w-full max-w-xs rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={Array.isArray(value) ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'fill_blank':
    case 'short_answer':
      return (
        <input
          type="text"
          className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={Array.isArray(value) ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'essay':
      return (
        <Textarea
          className="min-h-[220px]"
          value={Array.isArray(value) ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return null;
  }
}
