'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck, CheckCheck, AlertCircle, Users, Info, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AttendanceReportView } from './AttendanceReportView';

const STATUSES: { key: AttendanceStatus; label: string; active: string }[] = [
  { key: 'present', label: 'Present', active: 'bg-success text-success-foreground' },
  { key: 'absent', label: 'Absent', active: 'bg-danger text-danger-foreground' },
  { key: 'late', label: 'Late', active: 'bg-warning text-warning-foreground' },
  { key: 'leave', label: 'Leave', active: 'bg-info text-info-foreground' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const dayOfWeekOf = (date: string) => new Date(`${date}T12:00:00.000Z`).getUTCDay();

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
  const role = useAppSelector((s) => s.auth.user?.role);
  const isTeacher = role === 'teacher';
  const searchParams = useSearchParams();
  const linkedPeriodId = searchParams.get('period') ?? '';

  const [date, setDate] = useState(todayStr());
  const [periodId, setPeriodId] = useState(linkedPeriodId);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

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
  const classes = useMemo<{ id: string; name: string; sections: { id: string; name: string }[] }[]>(() => {
    const src: any[] = allClassesRes?.data ?? [];
    return src.map((c) => ({
      id: c.id,
      name: c.name,
      sections: (c.sections ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    }));
  }, [allClassesRes]);

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections ?? [],
    [classes, classId]
  );

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
      roster.students.forEach((s) => { next[s.studentId] = s.status; });
      setStatuses(next);
    }
  }, [roster]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    Object.values(statuses).forEach((s) => { c[s] += 1; });
    return c;
  }, [statuses]);

  const setAll = (status: AttendanceStatus) => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus> = {};
    roster.students.forEach((s) => { next[s.studentId] = status; });
    setStatuses(next);
  };

  const save = async () => {
    if (!roster) return;
    const records = roster.students.map((s) => ({
      studentId: s.studentId,
      status: statuses[s.studentId] ?? 'present',
    }));
    try {
      await markAttendance({ periodId, date, records }).unwrap();
      toast.success('Attendance saved');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save attendance');
    }
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
      {/* Controls */}
      <Card className="p-4">
        <div className={cn('grid grid-cols-1 gap-3', !isTeacher && 'sm:grid-cols-3')}>
          {!isTeacher && (
            <>
              <div>
                <Label>Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
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
                No periods scheduled {isTeacher ? 'for you' : 'for this section'} on this day.
              </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {periods.map((p) => (
                  <button
                    key={p.periodId}
                    type="button"
                    onClick={() => setPeriodId(p.periodId)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      periodId === p.periodId
                        ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                        : 'border-input bg-card text-foreground hover:bg-secondary'
                    )}
                  >
                    <Clock size={14} className="shrink-0 opacity-70" />
                    <span>
                      <span className="font-medium">{p.subject ?? 'Period'}</span>
                      {isTeacher && p.className && (
                        <span className="text-muted-foreground"> · {p.className}{p.sectionName ? `-${p.sectionName}` : ''}</span>
                      )}
                      <span className="text-muted-foreground"> · {p.startTime}–{p.endTime}</span>
                    </span>
                    {'marked' in p && p.marked && <Badge variant="success" className="ml-1">Marked</Badge>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {!isTeacher && classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No classes yet"
            description="Create a class with sections first, then you can mark attendance."
          />
        </Card>
      ) : !ready ? (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="Select a period"
            description={isTeacher
              ? 'Pick the class and time you\'re currently teaching to take attendance for it.'
              : 'Choose a class, section, date and period to load the student roster.'}
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
          {/* Summary + quick actions */}
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAll('present')}>
                <CheckCheck size={16} /> All present
              </Button>
              <Button size="sm" loading={saving} onClick={save}>Save attendance</Button>
            </div>
          </Card>

          {/* Roster */}
          <Card className="divide-y divide-border">
            {roster.students.map((s) => (
              <div key={s.studentId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
                    {getInitials(s.name.split(' ')[0] || '', s.name.split(' ')[1] || '')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.rollNumber}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((st) => {
                    const active = statuses[s.studentId] === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setStatuses((prev) => ({ ...prev, [s.studentId]: st.key }))}
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
                </div>
              </div>
            ))}
          </Card>

          <div className="flex justify-end">
            <Button loading={saving} onClick={save}>Save attendance</Button>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}
