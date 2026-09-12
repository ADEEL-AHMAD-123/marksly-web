'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  CalendarCheck, CheckCheck, AlertCircle, Users, Info, Clock, Search, StickyNote, AlertTriangle,
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
import { subjectColorClasses } from '@/lib/subject-color';
import { AttendanceReportView } from './AttendanceReportView';

const STATUSES: { key: AttendanceStatus; label: string; active: string }[] = [
  { key: 'present', label: 'Present', active: 'bg-success text-success-foreground' },
  { key: 'absent', label: 'Absent', active: 'bg-danger text-danger-foreground' },
  { key: 'late', label: 'Late', active: 'bg-warning text-warning-foreground' },
  { key: 'leave', label: 'Leave', active: 'bg-info text-info-foreground' },
];

const dayOfWeekOf = (date: string) => new Date(`${date}T12:00:00.000Z`).getUTCDay();

// Mirrors attendance-marking.service.ts's own 24h teacher lockout exactly
// (down to the same Karachi-offset math), so a teacher sees the roster
// disabled with a clear reason instead of filling it out and hitting
// ATTENDANCE_LOCKED only after clicking Save. Admins are never subject to
// this lock (checked separately by the caller via `isTeacher`).
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;
function isAttendanceLockedForTeacher(date: string): boolean {
  const utcMidnightMs = new Date(`${date}T00:00:00.000Z`).getTime();
  const karachiMidnightMs = utcMidnightMs - KARACHI_OFFSET_MS;
  const lockoutDeadlineMs = karachiMidnightMs + 24 * 60 * 60 * 1000;
  return Date.now() > lockoutDeadlineMs;
}

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

  const attendanceLocked = isTeacher && isAttendanceLockedForTeacher(date);

  const buildRecords = () => {
    if (!roster) return [];
    return roster.students.map((s) => ({
      studentId: s.studentId,
      status: statuses[s.studentId] ?? 'present',
      note: notes[s.studentId]?.trim() || undefined,
    }));
  };

  const doSave = async () => {
    if (!roster || attendanceLocked) return;
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
    if (!roster || attendanceLocked) return;
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
  const [tab, setTab] = useState<'mark' | 'report'>('mark');

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={tab === 'mark' ? 'Mark attendance for a specific period.' : 'Absent, late and leave students, with guardian contact details.'} />

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
          Absentee report
        </button>
      </div>

      {tab === 'report' ? (
        <AttendanceReportView />
      ) : (
        <>
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

        {/* Period picker — the actual class/period being taken, e.g. Maths, Class 5-B, 9:00–9:45 */}
        {(isTeacher || (classId && sectionId)) && (
          <div className="mt-4">
            <Label>Period</Label>
            {loadingPeriods ? (
              <Skeleton className="mt-1.5 h-10 w-full" />
            ) : periods.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No periods scheduled {isTeacher ? 'for you' : `for this ${sectionLabel.toLowerCase()}`} on this day.
              </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {periods.map((p) => {
                  const color = subjectColorClasses(p.subject ?? p.periodId);
                  const selected = periodId === p.periodId;
                  return (
                    <button
                      key={p.periodId}
                      type="button"
                      onClick={() => setPeriodId(p.periodId)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                          : cn(color.border, color.bg, 'text-foreground hover:brightness-95')
                      )}
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', selected ? 'bg-primary' : color.dot)} />
                      <span>
                        <span className="font-medium">{p.subject ?? 'Period'}</span>
                        {isTeacher && p.className && (
                          <span className="text-muted-foreground"> · {p.className}{p.sectionName ? `-${p.sectionName}` : ''}</span>
                        )}
                        <span className="text-muted-foreground"> · {p.startTime}–{p.endTime}</span>
                      </span>
                      {'marked' in p && p.marked && <Badge variant="success" className="ml-1">Marked</Badge>}
                    </button>
                  );
                })}
              </div>
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
          {attendanceLocked && (
            <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm text-warning-foreground">
              <Clock size={17} className="mt-0.5 shrink-0" />
              <span>Attendance older than 24 hours can only be changed by an admin — this roster is read-only for you now.</span>
            </div>
          )}

          {/* Summary + quick actions — sticky so the running counts and
              Save stay visible while scrolling a long roster, instead of
              scrolling away and forcing a trip back to the top. */}
          <Card className="sticky top-2 z-10 flex flex-col gap-3 border-border bg-card/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {selectedPeriod && (
                <Badge variant="neutral">
                  {roster.subject ?? selectedPeriod.subject ?? 'Period'} · {roster.startTime}–{roster.endTime}
                </Badge>
              )}
              {roster.alreadyMarked && (
                <Badge variant="primary" className="gap-1"><Info size={12} /> Already marked</Badge>
              )}
              <Badge variant="success">Present {counts.present}</Badge>
              <Badge variant="danger">Absent {counts.absent}</Badge>
              <Badge variant="warning">Late {counts.late}</Badge>
              <Badge variant="neutral">Leave {counts.leave}</Badge>
              {touched.size < roster.students.length && (
                <Badge variant="neutral" className="gap-1">
                  {roster.students.length - touched.size} not yet reviewed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={attendanceLocked}
                title={attendanceLocked ? 'Attendance older than 24 hours can only be changed by an admin' : undefined}
                onClick={handleAllPresentClick}
              >
                <CheckCheck size={16} /> All present
              </Button>
              <Button
                size="sm"
                loading={saving}
                disabled={attendanceLocked}
                title={attendanceLocked ? 'Attendance older than 24 hours can only be changed by an admin' : undefined}
                onClick={save}
              >
                Save attendance
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
          <Card className={cn('divide-y divide-border', attendanceLocked && 'opacity-60')}>
            {roster.students
              .filter((s) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
              })
              .map((s) => {
              const isTouched = touched.has(s.studentId);
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
                      {!isTouched && !attendanceLocked && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Not reviewed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.rollNumber}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUSES.map((st) => {
                    const active = isTouched && statuses[s.studentId] === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        disabled={attendanceLocked}
                        title={!isTouched ? `Defaults to Present if left unreviewed` : undefined}
                        onClick={() => {
                          setStatuses((prev) => ({ ...prev, [s.studentId]: st.key }));
                          setTouched((prev) => new Set(prev).add(s.studentId));
                        }}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          attendanceLocked && 'pointer-events-none cursor-not-allowed',
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
                    disabled={attendanceLocked}
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

          <div className="flex justify-end">
            <Button
              loading={saving}
              disabled={attendanceLocked}
              title={attendanceLocked ? 'Attendance older than 24 hours can only be changed by an admin' : undefined}
              onClick={save}
            >
              Save attendance
            </Button>
          </div>
        </>
      )}

      {/* Help — placed after the actual tool, same bottom-of-page pattern as
          Students, ID Cards, Academic Terms & Grading, Timetable, Classes and
          Subjects, not before it. Only relevant to marking, not the report tab. */}
      {isTeacher ? (
        <div className="space-y-2">
          <InfoNote title="Why can't I edit attendance from a few days ago?">
            <p>
              Once you mark a day&apos;s attendance, you have until <strong>24 hours after that day&apos;s midnight
              (Pakistan time)</strong> to go back and fix any mistakes yourself.
            </p>
            <p>
              After that window closes, the roster locks and only an admin can make changes — this keeps attendance
              records reliable once they&apos;ve been used for reports, so nobody can quietly change an old record
              weeks later.
            </p>
          </InfoNote>
        </div>
      ) : (
        <div className="space-y-2">
          <InfoNote title="How marking attendance works for admins/staff">
            <p>
              Picking a {terminology.classUnit.toLowerCase()}, {terminology.section.toLowerCase()} and date shows
              only the periods actually scheduled that day — a &quot;Marked&quot; badge means attendance was already
              submitted for that period.
            </p>
            <p>
              Unlike teachers, an admin can correct attendance for <strong>any date</strong>, including ones older
              than 24 hours — teachers lose that ability after the first day passes, which is why a teacher might
              ask you to fix something they can no longer touch themselves.
            </p>
          </InfoNote>
        </div>
      )}
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
