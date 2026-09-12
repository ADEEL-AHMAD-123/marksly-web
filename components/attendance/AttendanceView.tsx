'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  CalendarCheck, CheckCheck, AlertCircle, Users, Clock, Search, StickyNote, AlertTriangle,
  CheckCircle2, PencilLine, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoNote } from '@/components/ui/info-note';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetTimetableQuery } from '@/store/api/timetableApi';
import {
  useGetMyPeriodsQuery,
  useGetRosterQuery,
  useMarkAttendanceMutation,
  type AttendanceStatus,
} from '@/store/api/attendanceApi';
import { useAppSelector } from '@/store/hooks';
import { cn, getInitials } from '@/lib/utils';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';
import { AttendanceReportView } from './AttendanceReportView';

const STATUSES: { key: AttendanceStatus; label: string; active: string }[] = [
  { key: 'present', label: 'Present', active: 'bg-success text-success-foreground' },
  { key: 'absent', label: 'Absent', active: 'bg-danger text-danger-foreground' },
  { key: 'late', label: 'Late', active: 'bg-warning text-warning-foreground' },
  { key: 'leave', label: 'Leave', active: 'bg-info text-info-foreground' },
];

const dayOfWeekOf = (date: string) => new Date(`${date}T12:00:00.000Z`).getUTCDay();

// A teacher may now correct their own attendance with no time limit --
// see attendance-marking.service.ts's mark(), which removed the 24-hour
// lockout this used to mirror. Kept only for the Karachi-offset math
// todayStr() below still needs.
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;

// "Today" in institution-timezone (Asia/Karachi, UTC+5) terms, not the
// browser's own UTC/local date — mirrors the backend's karachiTodayStr()
// (attendance.helpers.ts), which is what actually decides FUTURE_DATE
// server-side. A plain `new Date().toISOString()` would read as tomorrow's
// date for part of the Karachi evening (UTC 19:00–23:59 = Karachi
// 00:00–04:59 next day), which would wrongly cap this date picker's `max`
// a day behind the real current day in Karachi during that window — a
// teacher/admin marking attendance late at night could find "today" is
// greyed out as unselectable even though the backend would accept it.
const todayStr = () => new Date(Date.now() + KARACHI_OFFSET_MS).toISOString().slice(0, 10);

interface PeriodOption {
  periodId: string;
  classId: string | null;
  className: string | null;
  sectionId: string | null;
  sectionName: string | null;
  subject: string | null;
  startTime: string;
  endTime: string;
  marked?: boolean;
}

export function AttendanceView({ title = 'Attendance' }: { title?: string }) {
  const terminology = useTerminology();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isTeacher = role === 'teacher';
  const searchParams = useSearchParams();
  const linkedPeriodId = searchParams.get('period') ?? '';
  // Deep link from TodaysAttendanceCard's dashboard widget — clicking a
  // specific section's pill lands here with that section pre-selected
  // instead of forcing a manual class → section re-drill-down for the
  // exact thing that was just clicked on. Teacher-only flow never uses
  // this (teachers don't pick a class/section at all).
  const linkedClassId = searchParams.get('classId') ?? '';
  const linkedSectionId = searchParams.get('sectionId') ?? '';

  const [date, setDate] = useState(todayStr());
  const [periodId, setPeriodId] = useState(linkedPeriodId);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  // Which students the teacher/admin has actually looked at and confirmed
  // this session — distinct from `statuses`, which every student has an
  // entry in from the moment the roster loads (unmarked students default
  // to 'present' server-side, per getRoster()). Without this, every row
  // renders as if Present had already been deliberately chosen, so a
  // teacher scanning a large class can't tell "I checked this student" from
  // "this is just the untouched default" — defeating the point of a review
  // step. A student already marked in a PRIOR submission (roster.alreadyMarked)
  // is seeded as touched, since that status is a real recorded value, not a
  // placeholder.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Confirmation before an overwrite that would actually discard something
  // — re-saving an already-marked roster, or "All present" clobbering marks
  // someone already set this session. Set to a summary of what's about to
  // happen; null means no dialog is showing.
  const [confirmSave, setConfirmSave] = useState<{ changedCount: number } | null>(null);
  const [confirmAllPresent, setConfirmAllPresent] = useState(false);
  // Filters the period picker once there are enough periods that scanning
  // them stops working — a teacher with 8-10 classes a day was previously
  // shown every period as an equally-weighted wrapped pill with no way to
  // jump straight to one.
  const [periodQuery, setPeriodQuery] = useState('');

  // ─── Teacher flow: pick from the periods on their own timetable today ────
  // `isLoading` (not `isFetching`) on purpose — now that the app refetches
  // on window focus (see baseApi.ts), `isFetching` would flip true on every
  // background refocus-triggered revalidation too, flashing the period
  // picker back to a skeleton and discarding the teacher's already-visible
  // selection mid-task. `isLoading` only covers the genuine first load.
  const { data: myPeriodsRes, isLoading: loadingMyPeriods } = useGetMyPeriodsQuery(
    { date },
    { skip: !isTeacher }
  );
  const myPeriods: PeriodOption[] = useMemo(
    () => (isTeacher ? myPeriodsRes?.data ?? [] : []),
    [isTeacher, myPeriodsRes]
  );

  // ─── Admin/staff flow: pick class → section → then a period from that
  // section's timetable for the selected date's day of week ────────────────
  const { data: allClassesRes } = useGetClassesQuery(undefined, { skip: isTeacher });
  const classes = useMemo<{ id: string; name: string; termType: string | null; sections: { id: string; name: string }[] }[]>(() => {
    const src: any[] = allClassesRes?.data ?? [];
    return src.map((c) => ({
      id: c.id,
      name: c.name,
      termType: c.termType ?? null,
      sections: (c.sections ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    }));
  }, [allClassesRes]);

  const [classId, setClassId] = useState(linkedClassId);
  const [sectionId, setSectionId] = useState(linkedSectionId);
  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? terminology.section;

  const { data: timetableRes, isLoading: loadingTimetable } = useGetTimetableQuery(
    { classId, sectionId },
    { skip: isTeacher || !classId || !sectionId }
  );
  const adminPeriods: PeriodOption[] = useMemo(() => {
    if (isTeacher) return [];
    const dow = dayOfWeekOf(date);
    return (timetableRes?.data ?? [])
      .filter((e) => e.dayOfWeek === dow)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((e) => ({
        periodId: e.id,
        classId: e.classId,
        className: e.className,
        sectionId: e.sectionId,
        sectionName: e.section,
        subject: e.subject,
        startTime: e.startTime,
        endTime: e.endTime,
      }));
  }, [isTeacher, timetableRes, date]);

  const periods = isTeacher ? myPeriods : adminPeriods;
  const loadingPeriods = isTeacher ? loadingMyPeriods : loadingTimetable;

  // Reset the chosen period whenever the underlying period list changes
  // (new date, or admin changed class/section) so a stale periodId from a
  // different day/section can't be submitted against the new roster. Skips
  // the very first render so a `?period=` deep link from "Teaching now"
  // survives instead of being cleared immediately.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPeriodId('');
  }, [date, classId, sectionId, isTeacher]);

  const ready = !!periodId;
  // `isLoading`, not `isFetching` — same reasoning as loadingMyPeriods
  // above, but higher stakes here: a background refocus-refetch mid-way
  // through marking attendance would otherwise blow the whole roster away
  // to a skeleton (the teacher's local `statuses` selections survive
  // underneath thanks to RTK Query's structural sharing keeping `roster`
  // referentially stable when the data hasn't actually changed, but the UI
  // would still visibly flash and re-render, which is disorienting mid-tap).
  const { data: rosterRes, isLoading, isError, refetch } = useGetRosterQuery(
    { periodId, date },
    // refetchOnFocus off here specifically: if attendance for this exact
    // period genuinely changed server-side between focus events (e.g. an
    // admin corrected it) while this teacher has unsaved taps in progress,
    // an auto-refetch would silently overwrite their in-progress marks with
    // server truth. Everywhere else in the app benefits from the global
    // refetchOnFocus (see baseApi.ts); this one screen is where "someone's
    // actively editing, don't yank the rug" outweighs "stay perfectly
    // fresh." The explicit Retry button (isError branch) still works via
    // manual refetch() regardless.
    { skip: !ready, refetchOnFocus: false }
  );
  const roster = rosterRes?.data;
  const [markAttendance, { isLoading: saving }] = useMarkAttendanceMutation();

  // Seed local statuses whenever a roster loads
  useEffect(() => {
    if (roster) {
      const next: Record<string, AttendanceStatus> = {};
      const nextNotes: Record<string, string> = {};
      roster.students.forEach((s) => { next[s.studentId] = s.status; nextNotes[s.studentId] = s.note ?? ''; });
      setStatuses(next);
      setNotes(nextNotes);
      // Already-marked = these are real recorded statuses, not placeholder
      // defaults — show them as reviewed from the start. A fresh roster
      // starts with nothing touched, so the review step actually means
      // something.
      setTouched(roster.alreadyMarked ? new Set(roster.students.map((s) => s.studentId)) : new Set());
      setQuery('');
    }
  }, [roster]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    Object.values(statuses).forEach((s) => { c[s] += 1; });
    return c;
  }, [statuses]);

  // How many students would actually change value if "All present" ran
  // right now — the count the confirm dialog shows, and what decides
  // whether a confirmation is even needed (nothing to lose = no dialog).
  const wouldChangeOnAllPresent = useMemo(() => {
    if (!roster) return 0;
    return roster.students.filter((s) => touched.has(s.studentId) && statuses[s.studentId] !== 'present').length;
  }, [roster, touched, statuses]);

  // Whether the current on-screen selections actually differ from what's
  // saved server-side (roster.students' own status/note, exactly as
  // getRoster() returned them). A brand-new, never-marked roster is always
  // considered dirty — the "everyone defaults to Present" first submission
  // is a real, intentional save, not a no-op. For an already-marked
  // roster, this is what decides whether Save has anything to do at all —
  // without it, re-clicking Save on an unchanged, already-submitted roster
  // still fired a write and (if anything looked different due to stale
  // local state) could trigger the "overwrite" confirmation for nothing.
  const isDirty = useMemo(() => {
    if (!roster) return false;
    if (!roster.alreadyMarked) return true;
    return roster.students.some((s) => {
      const curStatus = statuses[s.studentId] ?? 'present';
      const curNote = (notes[s.studentId] ?? '').trim();
      return curStatus !== s.status || curNote !== (s.note ?? '').trim();
    });
  }, [roster, statuses, notes]);

  const applyAllPresent = () => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus> = {};
    roster.students.forEach((s) => { next[s.studentId] = 'present'; });
    setStatuses(next);
    setTouched(new Set(roster.students.map((s) => s.studentId)));
    setConfirmAllPresent(false);
  };

  const handleAllPresentClick = () => {
    if (wouldChangeOnAllPresent > 0) {
      setConfirmAllPresent(true);
    } else {
      applyAllPresent();
    }
  };

  const buildRecords = () => {
    if (!roster) return [];
    return roster.students.map((s) => ({
      studentId: s.studentId,
      status: statuses[s.studentId] ?? 'present',
      note: notes[s.studentId]?.trim() || undefined,
    }));
  };

  const doSave = async () => {
    if (!roster) return;
    try {
      await markAttendance({ periodId, date, records: buildRecords() }).unwrap();
      toast.success('Attendance saved');
      setConfirmSave(null);
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save attendance');
    }
  };

  // Re-saving an already-marked roster silently overwrites every prior
  // status with zero review — show exactly how many records would change
  // before committing, same "what will happen" preview Timetable's own
  // destructive actions already use. A first-ever submission (nothing to
  // lose yet) saves straight away.
  const save = async () => {
    if (!roster) return;
    if (roster.alreadyMarked) {
      const changedCount = roster.students.filter((s) => s.status !== (statuses[s.studentId] ?? 'present')).length;
      if (changedCount > 0) {
        setConfirmSave({ changedCount });
        return;
      }
    }
    await doSave();
  };

  const selectedPeriod = periods.find((p) => p.periodId === periodId);
  // Marking attendance is a teacher's everyday job, not an admin one — an
  // admin's whole reason to be on this page is to review/export what
  // teachers have already recorded. So for admin/staff this page IS the
  // Attendance Report: no tab bar, no "Mark attendance" landing view, just
  // the report with a plain explanation of who actually does the marking.
  // Correcting a record directly is kept, but only as a clearly secondary,
  // named "admin override" — for the genuine exception (a teacher who's
  // left, or a period nobody covered), not a routine second half of this
  // page. Every mark() call it makes is logged server-side (see
  // attendance-marking.service.ts) precisely because it's meant to be
  // rare. Teachers still get the familiar two-tab layout, unchanged.
  // The dashboard links straight into marking a SPECIFIC unmarked section
  // (via ?classId=&sectionId=, e.g. "Mark next" on Today's Attendance) --
  // that's a genuine exception case (a period nobody covered yet), so it
  // should land right on the mark tab in override mode rather than on the
  // report tab the admin would otherwise start on.
  const hasLinkedTarget = Boolean(linkedClassId && linkedSectionId);
  const [tab, setTab] = useState<'mark' | 'report'>(
    isTeacher || hasLinkedTarget ? 'mark' : 'report'
  );
  const [adminOverride, setAdminOverride] = useState(!isTeacher && hasLinkedTarget);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={
          isTeacher
            ? tab === 'mark' ? 'Mark attendance for a specific period.' : 'Attendance by date, class and period, with guardian contact details.'
            : adminOverride
              ? 'Admin override — marking or correcting a period directly.'
              : 'Attendance is marked by teachers, period by period. Review it here across your institution, and export it whenever you need to.'
        }
      />

      {isTeacher && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('mark')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === 'mark' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
            )}
          >
            Mark attendance
          </button>
          <button
            type="button"
            onClick={() => setTab('report')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === 'report' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
            )}
          >
            Attendance report
          </button>
        </div>
      )}

      {/* Admin/staff, everyday case: this IS the Attendance Report page —
          a plain explanation of who marks attendance and why this page is
          a report, not a marking tool, with the rare correction path
          folded into that same explanation instead of floating as its own
          top-of-page control. */}
      {!isTeacher && tab === 'report' && (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
            <Users size={16} />
          </span>
          <div className="min-w-0 text-sm text-muted-foreground">
            <p>
              You shouldn&apos;t need to touch a record directly except in a real exception — a teacher who&apos;s left the
              school, or a period nobody covered.{' '}
              <button
                type="button"
                onClick={() => { setTab('mark'); setAdminOverride(true); }}
                className="font-medium text-primary underline decoration-dotted underline-offset-4 hover:no-underline"
              >
                Correct a record directly (admin override)
              </button>
            </p>
          </div>
        </div>
      )}

      {!isTeacher && tab === 'mark' && (
        <button
          type="button"
          onClick={() => { setTab('report'); setAdminOverride(false); }}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Done, back to Attendance Report
        </button>
      )}

      {tab === 'report' ? (
        <AttendanceReportView />
      ) : (
        <>
        {!isTeacher && adminOverride && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-3 text-sm text-warning-foreground">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>
              You&apos;re marking/correcting attendance directly as an admin, bypassing the class&apos;s own teacher — this
              is meant for exceptions (a teacher no longer has access, or a period nobody has covered) and is recorded
              in the server log with your name and what changed.
            </span>
          </div>
        )}
      {/* Toolbar — purely instrumental (pick the class/section/date/period to
          mark), kept visually lighter than the cards below it, same
          convention as the admin dashboard's Classes/Subjects/ID Cards/
          Timetable pages. */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className={cn('grid grid-cols-1 gap-3', !isTeacher && 'sm:grid-cols-3')}>
          {!isTeacher && (
            <>
              <div>
                <Label>{terminology.classUnit}</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
                  <SelectTrigger><SelectValue placeholder={`Select ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{sectionLabel}</Label>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                  <SelectTrigger><SelectValue placeholder={sectionLabel} /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Period picker — rebuilt around class first, not subject: a
            teacher scans this list looking for "which class am I taking
            right now", not "which subject". The old version rendered every
            period as an equally-weighted, subject-colored wrapped pill —
            fine for 2-3 periods, unreadable for a teacher with 8-10 classes
            a day, where the pills wrapped into a messy multi-color block
            with no way to jump to one directly. This is a plain vertical
            list (one row per period, class+section as the primary text)
            with a search box once there are enough periods that scanning
            stops working. */}
        {(isTeacher || (classId && sectionId)) && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Period</Label>
              {periods.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {periods.filter((p) => 'marked' in p && p.marked).length} of {periods.length} marked
                </span>
              )}
            </div>
            {loadingPeriods ? (
              <Skeleton className="mt-1.5 h-24 w-full" />
            ) : periods.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No periods scheduled {isTeacher ? 'for you' : `for this ${sectionLabel.toLowerCase()}`} on this day.
              </p>
            ) : (
              <>
                {periods.length > 6 && (
                  <div className="relative mt-1.5">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={periodQuery}
                      onChange={(e) => setPeriodQuery(e.target.value)}
                      placeholder={isTeacher ? 'Find a class or subject…' : 'Find a subject…'}
                      className="h-9 w-full rounded-lg border border-input bg-card pl-8 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
                <div className="mt-1.5 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {periods
                    .filter((p) => {
                      const q = periodQuery.trim().toLowerCase();
                      if (!q) return true;
                      const haystack = `${p.className ?? ''} ${p.sectionName ?? ''} ${p.subject ?? ''}`.toLowerCase();
                      return haystack.includes(q);
                    })
                    .map((p) => {
                      const selected = periodId === p.periodId;
                      const marked = 'marked' in p && p.marked;
                      return (
                        <button
                          key={p.periodId}
                          type="button"
                          onClick={() => setPeriodId(p.periodId)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                            selected ? 'bg-primary-soft' : 'hover:bg-muted/60'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                              marked ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {marked ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-foreground">
                              {isTeacher && p.className
                                ? `${p.className}${p.sectionName ? ` — ${p.sectionName}` : ''}`
                                : p.subject ?? 'Period'}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {isTeacher && p.subject ? `${p.subject} · ` : ''}{p.startTime}–{p.endTime}
                            </span>
                          </span>
                          {marked && <Badge variant="success" className="shrink-0">Marked</Badge>}
                          <ChevronRight size={15} className={cn('shrink-0 text-muted-foreground', selected && 'text-primary')} />
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!isTeacher && classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={`No ${terminology.classUnitPlural.toLowerCase()} yet`}
            description={`Create a ${terminology.classUnit.toLowerCase()} with ${terminology.sectionPlural.toLowerCase()} first, then you can mark attendance.`}
          />
        </Card>
      ) : !ready ? (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="Select a period"
            description={isTeacher
              ? `Pick the ${terminology.classUnit.toLowerCase()} and time you're currently teaching to take attendance for it.`
              : `Choose a ${terminology.classUnit.toLowerCase()}, ${terminology.section.toLowerCase()}, date and period to load the student roster.`}
          />
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load roster"
            description="Check the API connection and try again."
            action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
          />
        </Card>
      ) : isLoading || !roster ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : roster.students.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No students in this section" description="Add students to this class and section first." />
        </Card>
      ) : (
        <>
          {/* Already-marked banner — its own unmistakable, full-width line
              instead of one small badge buried among four other colored
              count badges (where it previously sat). This is the single
              most important thing to notice before touching anything below:
              you are not filling this in for the first time, you are
              reviewing/correcting something already submitted. */}
          {roster.alreadyMarked && (
            <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary-soft px-3.5 py-2.5 text-sm text-primary-soft-foreground">
              <CheckCircle2 size={17} className="shrink-0 text-primary" />
              <span>
                Already saved{roster.submittedAt ? ` at ${new Date(roster.submittedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}` : ''} — you&apos;re reviewing it now.
                {isDirty && <strong className="ml-1">You have unsaved changes below.</strong>}
              </span>
            </div>
          )}

          {/* Summary + quick actions — sticky so the running counts and
              Save stay visible while scrolling a long roster, instead of
              scrolling away and forcing a trip back to the top. Counts are
              deliberately styled as plain stat text (not colored pills) so
              they read as information, not as a second set of clickable
              status buttons duplicating the per-student ones below. */}
          <Card className="sticky top-2 z-10 flex flex-col gap-3 border-border bg-card/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {selectedPeriod && (
                <span className="font-medium text-foreground">
                  {roster.subject ?? selectedPeriod.subject ?? 'Period'} · {roster.startTime}–{roster.endTime}
                </span>
              )}
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span><strong className="text-success">{counts.present}</strong> present</span>
                <span><strong className="text-danger">{counts.absent}</strong> absent</span>
                <span><strong className="text-warning">{counts.late}</strong> late</span>
                <span><strong className="text-foreground">{counts.leave}</strong> leave</span>
              </span>
              {touched.size < roster.students.length && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {roster.students.length - touched.size} not yet reviewed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAllPresentClick}
              >
                <CheckCheck size={16} /> All present
              </Button>
              <Button
                size="sm"
                variant={roster.alreadyMarked && !isDirty ? 'secondary' : 'primary'}
                loading={saving}
                disabled={roster.alreadyMarked && !isDirty}
                title={roster.alreadyMarked && !isDirty ? 'Nothing has changed since this was last saved' : undefined}
                onClick={save}
              >
                {roster.alreadyMarked
                  ? isDirty ? <><PencilLine size={16} /> Save changes</> : <><CheckCircle2 size={16} /> Saved</>
                  : 'Save attendance'}
              </Button>
            </div>
          </Card>

          {/* Search — for a large section, jump straight to a student by
              name or roll number instead of scrolling a long flat list. */}
          {roster.students.length > 8 && (
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or roll number…"
                className="pl-9"
              />
            </div>
          )}

          {/* Roster */}
          <Card className="divide-y divide-border">
            {roster.students
              .filter((s) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
              })
              .map((s) => {
              const isTouched = touched.has(s.studentId);
              // Only meaningful once this period was already marked before
              // — a per-student "this is different from what's saved"
              // signal, so reviewing/correcting an already-submitted
              // roster shows exactly what would change, not just an
              // overall count in the confirm dialog after the fact.
              const isEdited = roster.alreadyMarked && (statuses[s.studentId] ?? 'present') !== s.status;
              return (
              <div key={s.studentId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    photoUrl={s.profilePhoto}
                    alt={s.name}
                    initials={getInitials(s.name.split(' ')[0] || '', s.name.split(' ')[1] || '')}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                      {!isTouched && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Not reviewed
                        </span>
                      )}
                      {isEdited && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                          <PencilLine size={9} /> Edited
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Roll {s.rollNumber}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUSES.map((st) => {
                    const active = isTouched && statuses[s.studentId] === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        title={!isTouched ? `Defaults to Present if left unreviewed` : undefined}
                        onClick={() => {
                          setStatuses((prev) => ({ ...prev, [s.studentId]: st.key }));
                          setTouched((prev) => new Set(prev).add(s.studentId));
                        }}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          active
                            ? st.active
                            : 'bg-muted text-muted-foreground hover:bg-secondary'
                        )}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    title={notes[s.studentId] ? `Note: ${notes[s.studentId]}` : 'Add a note'}
                    onClick={() => setNoteOpenFor((cur) => (cur === s.studentId ? null : s.studentId))}
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                      notes[s.studentId]
                        ? 'bg-primary-soft text-primary-soft-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <StickyNote size={14} />
                  </button>
                </div>

                {noteOpenFor === s.studentId && (
                  <div className="sm:ml-2 sm:w-56">
                    <Input
                      autoFocus
                      value={notes[s.studentId] ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [s.studentId]: e.target.value }))}
                      onBlur={() => setNoteOpenFor(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setNoteOpenFor(null)}
                      placeholder="e.g. Called in sick"
                      maxLength={200}
                    />
                  </div>
                )}
              </div>
              );
            })}
          </Card>

        </>
      )}

      {/* Help — placed after the actual tool, same bottom-of-page pattern as
          Students, ID Cards, Academic Terms & Grading, Timetable, Classes and
          Subjects, not before it. Only relevant to marking, so it's gated to
          the Mark tab itself rather than always showing (which would put an
          admin-only note in front of a teacher, or vice versa, while just
          reading the Report). */}
      {tab === 'mark' && (isTeacher ? (
        <div className="mt-2 space-y-2 border-t border-border pt-5">
          <InfoNote title="Can I fix a mistake from a while ago?">
            <p>
              Yes — you can correct attendance for any of your own periods, on any past date, whenever you notice a
              mistake. There&apos;s no 24-hour cutoff; it&apos;s always yours to fix.
            </p>
            <p>
              This only covers periods you actually teach. If you need to change attendance for a class that isn&apos;t
              yours, ask an admin.
            </p>
          </InfoNote>
        </div>
      ) : (
        <div className="mt-2 space-y-2 border-t border-border pt-5">
          <InfoNote title="What is admin override, and when should I use it?">
            <p>
              Every teacher can now correct their own attendance any time, with no 24-hour cutoff — so this shouldn&apos;t
              come up often. Use it only when the teacher who owns a period genuinely can&apos;t fix it themselves (they&apos;ve
              left the school, lost access, or a period was never covered by anyone).
            </p>
            <p>
              Picking a {terminology.classUnit.toLowerCase()}, {terminology.section.toLowerCase()} and date shows only
              the periods scheduled that day — a &quot;Marked&quot; badge means attendance was already submitted.
              Every override you make here is written to the server log with your name, so use it deliberately.
            </p>
          </InfoNote>
        </div>
      ))}
        </>
      )}

      <ConfirmAllPresentDialog
        open={confirmAllPresent}
        changedCount={wouldChangeOnAllPresent}
        onClose={() => setConfirmAllPresent(false)}
        onConfirm={applyAllPresent}
      />
      <ConfirmSaveDialog
        info={confirmSave}
        loading={saving}
        onClose={() => setConfirmSave(null)}
        onConfirm={doSave}
      />
    </div>
  );
}

function ConfirmAllPresentDialog({
  open, changedCount, onClose, onConfirm,
}: {
  open: boolean;
  changedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold">Mark everyone present?</DialogPrimitive.Title>
              <DialogPrimitive.Description asChild>
                <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <strong>{changedCount}</strong> student{changedCount === 1 ? '' : 's'} already {changedCount === 1 ? 'has' : 'have'} a
                    different status set — this will overwrite {changedCount === 1 ? 'it' : 'them all'} back to Present.
                    This isn&apos;t saved yet, so nothing is final until you click Save attendance afterward.
                  </p>
                </div>
              </DialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" size="sm" onClick={onConfirm}>Yes, mark all present</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ConfirmSaveDialog({
  info, loading, onClose, onConfirm,
}: {
  info: { changedCount: number } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root open={!!info} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
        >
          {info && (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                  <AlertTriangle size={16} />
                </span>
                <div className="min-w-0">
                  <DialogPrimitive.Title className="text-base font-semibold">Overwrite the saved attendance?</DialogPrimitive.Title>
                  <DialogPrimitive.Description asChild>
                    <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                      <p>
                        This period was already marked. Saving now will replace <strong>{info.changedCount}</strong>{' '}
                        student{info.changedCount === 1 ? "'s" : "s'"} status with what&apos;s currently shown here —
                        including sending any new guardian alerts for a newly-absent/late/leave student, or a
                        correction notice for anyone reverted back to present.
                      </p>
                    </div>
                  </DialogPrimitive.Description>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button size="sm" loading={loading} onClick={onConfirm}>Yes, save changes</Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
