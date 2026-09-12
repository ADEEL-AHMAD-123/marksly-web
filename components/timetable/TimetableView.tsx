'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  CalendarClock, Plus, Trash2, X, Clock, MapPin, AlertTriangle, Pencil, Printer, Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { InfoNote } from '@/components/ui/info-note';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetSubjectsQuery } from '@/store/api/subjectsApi';
import {
  useGetTimetableQuery, useCreateEntryMutation, useUpdateEntryMutation, useDeleteEntryMutation,
  type TimetableEntry, type CreateEntryBody,
} from '@/store/api/timetableApi';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Print stylesheet for the weekly timetable grid — same convention as
// ID_CARD_PRINT_CSS (components/shared/idCardPrint.ts): hide everything
// except the dedicated print container, force a light background/border so
// it reads on paper, and let the grid use the full printable page.
const TIMETABLE_PRINT_CSS = `
@media print {
  @page { size: landscape; margin: 10mm; }
  body * { visibility: hidden !important; }
  #timetable-print, #timetable-print * { visibility: visible !important; }
  #timetable-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: #fff !important;
  }
  .no-print { display: none !important; }
  /* Tailwind's hidden/md:block/md:hidden classes are driven by a screen-
     width media query, which still evaluates during print regardless of
     the actual paper size — so printing from a narrow browser window would
     otherwise print the mobile card list instead of the desktop grid.
     Force the desktop grid on and the mobile list off unconditionally
     while printing. */
  #timetable-print .hidden.md\\:block { display: block !important; }
  #timetable-print .md\\:hidden { display: none !important; }
  #timetable-print table {
    width: 100%;
    border-collapse: collapse;
  }
  #timetable-print th, #timetable-print td {
    border: 1px solid #999 !important;
    color: #111 !important;
    background: #fff !important;
    padding: 4px 6px;
    font-size: 10px;
  }
}`;

/** A row in the grid: possibly several distinct (startTime,endTime) pairs
 *  that all landed close enough together to share one visual row. */
export interface TimeRow {
  /** Every distinct "start-end" key that belongs in this row. */
  members: Set<string>;
  /** Earliest start / latest end across the group — used as the row's
   *  shared time-column label. */
  startTime: string;
  endTime: string;
}

const ROW_MERGE_THRESHOLD_MIN = 10;

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Build the row structure for a genuine grid: rows are formed by
 *  greedily grouping distinct (startTime,endTime) pairs — sorted by start
 *  time — into overlap/proximity-based buckets rather than keying on the
 *  exact string, so two days with near-identical bell times (e.g. Monday
 *  09:00-09:45 vs Tuesday 09:00-09:40) land in the same row instead of
 *  producing near-duplicate rows. A pair joins the current row if its start
 *  time either overlaps the row's time span so far, or is within
 *  ROW_MERGE_THRESHOLD_MIN minutes of the row's current end — genuinely
 *  different times of day (e.g. 9am vs 2pm) fall well outside that and
 *  start a new row. Each day still renders its own exact start–end time
 *  inside its cell, since a merged row's shared label is only an
 *  approximation of the group's span. */
function useTimeRows(entries: TimetableEntry[]) {
  return useMemo(() => {
    const seen = new Map<string, { startTime: string; endTime: string }>();
    for (const e of entries) {
      const key = `${e.startTime}-${e.endTime}`;
      if (!seen.has(key)) seen.set(key, { startTime: e.startTime, endTime: e.endTime });
    }
    const distinct = Array.from(seen.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const rows: TimeRow[] = [];
    for (const pair of distinct) {
      const start = toMinutes(pair.startTime);
      const end = toMinutes(pair.endTime);
      const last = rows[rows.length - 1];
      if (last && start <= toMinutes(last.endTime) + ROW_MERGE_THRESHOLD_MIN) {
        last.members.add(pair.key);
        if (toMinutes(pair.startTime) < toMinutes(last.startTime)) last.startTime = pair.startTime;
        if (end > toMinutes(last.endTime)) last.endTime = pair.endTime;
      } else {
        rows.push({ members: new Set([pair.key]), startTime: pair.startTime, endTime: pair.endTime });
      }
    }
    return rows;
  }, [entries]);
}

/** Which days to actually render as columns/sections: Mon–Fri always;
 *  Sunday/Saturday only if they actually have at least one period, so an
 *  institution running a 5-day week doesn't get two permanently-empty
 *  weekend columns cluttering the grid. */
function useVisibleDays(entries: TimetableEntry[]) {
  return useMemo(() => {
    const hasEntries = new Set(entries.map((e) => e.dayOfWeek));
    return DAYS.map((day, idx) => ({ day, idx }))
      .filter(({ idx }) => (idx >= 1 && idx <= 5) || hasEntries.has(idx));
  }, [entries]);
}

export function TimetableView() {
  const terminology = useTerminology();
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  // Set when a specific day's "+" is clicked, so the drawer opens with that
  // day preselected instead of always defaulting to Monday — filling out a
  // whole week one period at a time was needlessly fiddly otherwise.
  const [addDay, setAddDay] = useState('1');
  const [copyDayIdx, setCopyDayIdx] = useState<number | null>(null);
  const [deleteEntry] = useDeleteEntryMutation();

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];
  // Once a class is actually picked, prefer its own term's wording (e.g. a
  // short-session course should say "Batch") over the institution-wide
  // default — falls back to the generic default while nothing is selected.
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? terminology.section;
  const ready = !!classId && !!sectionId;
  const { data, isFetching } = useGetTimetableQuery({ classId, sectionId }, { skip: !ready });
  const entries = useMemo(() => data?.data ?? [], [data]);

  const visibleDays = useVisibleDays(entries);
  const timeRows = useTimeRows(entries);

  const byDay = useMemo(() => {
    const m: Record<number, TimetableEntry[]> = {};
    for (const e of entries) (m[e.dayOfWeek] ??= []).push(e);
    return m;
  }, [entries]);

  const cellFor = (dayIdx: number, row: { members: Set<string> }) =>
    (byDay[dayIdx] ?? []).find((e) => row.members.has(`${e.startTime}-${e.endTime}`)) ?? null;

  const remove = async (id: string) => {
    try { await deleteEntry(id).unwrap(); toast.success('Period removed'); }
    catch { toast.error('Could not remove'); }
  };

  const openEdit = (entry: TimetableEntry) => setEditEntry(entry);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description={`Build the weekly schedule per ${sectionLabel.toLowerCase()}.`}
        actions={ready ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </Button>
            <Button size="sm" className="no-print" onClick={() => { setAddDay('1'); setAddOpen(true); }}>
              <Plus size={16} /> Add period
            </Button>
          </div>
        ) : undefined}
      />

      {/* Toolbar — same lighter "picker" treatment as IdCardsView.tsx's
          class/section picker (rounded-xl, muted/20, no own shadow) rather
          than a full Card, since this is a filter control, not content. */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>{terminology.classUnit}</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
              <SelectTrigger><SelectValue placeholder={`Select ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{sectionLabel}</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder={sectionLabel} /></SelectTrigger>
              <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        // Distinct from the "pick one" empty state below — an empty class
        // dropdown with the same generic "Select a class" message left an
        // admin with nothing to actually select, no explanation why.
        <Card><EmptyState icon={CalendarClock} title={`No ${terminology.classUnitPlural.toLowerCase()} yet`} description={`Create a ${terminology.classUnit.toLowerCase()} first (${terminology.classUnitPlural} page) before building a timetable.`} /></Card>
      ) : !ready ? (
        <Card><EmptyState icon={CalendarClock} title={`Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()}`} description={`Choose a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()} to view or build its timetable.`} /></Card>
      ) : isFetching && entries.length === 0 ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : entries.length === 0 ? (
        <Card><EmptyState icon={CalendarClock} title="No periods yet" description="Add the first period above to start building this section's timetable." /></Card>
      ) : (
        <>
          <style dangerouslySetInnerHTML={{ __html: TIMETABLE_PRINT_CSS }} />
          <div id="timetable-print">
            {/* Desktop / print: real grid — days as columns, one row per
                distinct time range used anywhere this week. */}
            <div className="hidden md:block">
              <Card className="overflow-x-auto p-0">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="w-28 border-r border-border px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Time</th>
                      {visibleDays.map(({ day, idx }) => (
                        <th key={day} className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold text-foreground last:border-r-0">
                          <div className="flex items-center justify-between gap-2">
                            <span>{day}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Actions for ${day}`}
                                  className="no-print rounded-md p-1 font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  <Copy size={13} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setAddDay(String(idx)); setAddOpen(true); }}>
                                  <Plus size={14} /> Add period on {day}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={(byDay[idx] ?? []).length === 0}
                                  onClick={() => setCopyDayIdx(idx)}
                                >
                                  <Copy size={14} /> Copy {day} to other days
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeRows.map((row) => (
                      <tr key={Array.from(row.members).sort().join('|')} className="border-b border-border last:border-b-0">
                        <td className="border-r border-border px-3 py-2 align-top text-xs font-medium text-foreground">
                          {row.startTime}–{row.endTime}
                        </td>
                        {visibleDays.map(({ day, idx }) => {
                          const entry = cellFor(idx, row);
                          const entryTimeDiffers = entry
                            && (entry.startTime !== row.startTime || entry.endTime !== row.endTime);
                          return (
                            <td key={day} className="border-r border-border px-2 py-1.5 align-top last:border-r-0">
                              {entry ? (
                                <div className="group relative rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(entry)}
                                    className="block w-full text-left"
                                  >
                                    {entryTimeDiffers && (
                                      <p className="truncate text-[10px] font-medium text-muted-foreground">{entry.startTime}–{entry.endTime}</p>
                                    )}
                                    <p className="truncate text-xs font-semibold text-foreground">{entry.subject ?? 'No subject'}</p>
                                    {entry.teacher ? (
                                      <p className="truncate text-[11px] text-muted-foreground">{entry.teacher}</p>
                                    ) : (
                                      <p className="flex items-center gap-1 truncate text-[11px] text-warning">
                                        <AlertTriangle size={10} className="shrink-0" /> No teacher
                                      </p>
                                    )}
                                    {entry.room && (
                                      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                        <MapPin size={9} className="shrink-0" /> {entry.room}
                                      </p>
                                    )}
                                  </button>
                                  <div className="no-print absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                                    <button
                                      type="button"
                                      aria-label="Edit period"
                                      onClick={() => openEdit(entry)}
                                      className="rounded-md bg-card p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Remove period"
                                      onClick={() => remove(entry.id)}
                                      className="rounded-md bg-card p-1 text-muted-foreground shadow-sm hover:bg-danger-soft hover:text-danger"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full min-h-[2.5rem]" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Mobile: per-day card list — same day-selector-free stacked
                pattern used elsewhere (StudentsView.tsx) since a full grid
                table doesn't fit a narrow screen usefully. */}
            <div className="space-y-4 md:hidden">
              {visibleDays.map(({ day, idx }) => {
                const periods = (byDay[idx] ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <Card key={day} className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{day}</p>
                      <div className="no-print flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setAddDay(String(idx)); setAddOpen(true); }}
                          aria-label={`Add period on ${day}`}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Plus size={15} />
                        </button>
                        {periods.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCopyDayIdx(idx)}
                            aria-label={`Copy ${day} to other days`}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {periods.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No periods</p>
                    ) : (
                      <ul className="space-y-2">
                        {periods.map((e) => (
                          <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                            <span className="flex items-center gap-1 text-xs font-medium text-foreground"><Clock size={12} /> {e.startTime}–{e.endTime}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{e.subject ?? 'No subject'}</p>
                              {e.teacher ? (
                                <p className="truncate text-xs text-muted-foreground">
                                  {e.teacher}{e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                                </p>
                              ) : (
                                <p className="flex items-center gap-1 truncate text-xs text-warning">
                                  <AlertTriangle size={11} className="shrink-0" /> No teacher assigned
                                  {e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                                </p>
                              )}
                            </div>
                            <button onClick={() => openEdit(e)} aria-label="Edit period" className="no-print rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
                            <button onClick={() => remove(e.id)} aria-label="Remove period" className="no-print rounded-lg p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"><Trash2 size={15} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Help — placed after the actual tool, same bottom-of-page pattern as
          ID Cards and Academic Terms & Grading, not before it. */}
      <div className="space-y-2 no-print">
        <InfoNote
          title="Set these up first, or the timetable will have gaps"
          link={{ href: '/admin/subjects', label: 'Go to Subjects' }}
        >
          <p>
            A timetable is built per {terminology.classUnit.toLowerCase()} and {sectionLabel.toLowerCase()}, so both
            need to exist before you can add a single period — and each period needs a subject to pick from, so{' '}
            <strong>add your subjects first</strong> or the subject dropdown here will be empty.
          </p>
          <p>
            If a {terminology.classUnit.toLowerCase()} or {sectionLabel.toLowerCase()} has{' '}
            <strong>no period scheduled for today</strong>, teachers won&apos;t see anything to mark attendance for
            on that day — attendance is always taken against a specific period, not just a date. Add the missing
            period here to fix it.
          </p>
        </InfoNote>
      </div>

      <PeriodDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classId={classId}
        sectionId={sectionId}
        initialDay={addDay}
      />
      <PeriodDrawer
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        classId={classId}
        sectionId={sectionId}
        initialDay={editEntry ? String(editEntry.dayOfWeek) : '1'}
        editingEntry={editEntry}
      />
      {copyDayIdx !== null && (
        <CopyDayDialog
          open={copyDayIdx !== null}
          onClose={() => setCopyDayIdx(null)}
          sourceDayIdx={copyDayIdx}
          entries={byDay[copyDayIdx] ?? []}
          classId={classId}
          sectionId={sectionId}
        />
      )}
    </div>
  );
}

function PeriodDrawer({
  open, onClose, classId, sectionId, initialDay, editingEntry,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  sectionId: string;
  initialDay: string;
  editingEntry?: TimetableEntry | null;
}) {
  const { data: subjectsRes } = useGetSubjectsQuery();
  const allSubjects = subjectsRes?.data ?? [];
  // Subjects are class-scoped (the same subject NAME can exist as separate
  // records for different classes — "Mathematics" for Grade 8 and
  // "Mathematics" for Grade 9 are different Subject documents). Without
  // this filter, every subject in the institution showed up here regardless
  // of which class's timetable was being edited, so an admin could
  // accidentally attach a completely unrelated class's subject to this
  // slot — both looked identical as plain "Mathematics" in the dropdown.
  const subjects = useMemo(() => allSubjects.filter((s) => s.classId === classId), [allSubjects, classId]);
  const [createEntry, { isLoading: creating }] = useCreateEntryMutation();
  const [updateEntry, { isLoading: updating }] = useUpdateEntryMutation();
  const isLoading = creating || updating;
  const isEdit = !!editingEntry;

  const [dayOfWeek, setDayOfWeek] = useState(initialDay);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [subjectId, setSubjectId] = useState('');
  const [room, setRoom] = useState('');

  // Re-sync whenever the drawer is (re)opened — either via a specific day's
  // "+" (add) or by clicking an existing period (edit) — the component
  // instance stays mounted between opens, so without this it would keep
  // showing whatever was there last time.
  useEffect(() => {
    if (!open) return;
    if (editingEntry) {
      setDayOfWeek(String(editingEntry.dayOfWeek));
      setStartTime(editingEntry.startTime);
      setEndTime(editingEntry.endTime);
      setSubjectId(editingEntry.subjectId ?? '');
      setRoom(editingEntry.room ?? '');
    } else {
      setDayOfWeek(initialDay);
      setStartTime('09:00');
      setEndTime('09:45');
      setSubjectId('');
      setRoom('');
    }
  }, [open, initialDay, editingEntry]);

  // Resolved teacher shown read-only — comes straight from the Subject's
  // own section-coverage/fallback assignment, matching exactly what the
  // backend will derive server-side (resolveTeacherId in
  // timetable.service.ts). teacherId is never sent from this form at all.
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const resolvedTeacherName = useMemo(() => {
    if (!selectedSubject) return null;
    const covered = selectedSubject.sectionCoverage.find((r) => r.sectionId === sectionId);
    return covered?.teacherName ?? selectedSubject.teacherName ?? null;
  }, [selectedSubject, sectionId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Same rule the backend enforces (see timetable.service.ts) — checked
    // here too so the user sees it instantly instead of after a round trip.
    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }
    const body: CreateEntryBody = {
      classId, sectionId, dayOfWeek: Number(dayOfWeek), startTime, endTime,
      subjectId: subjectId || undefined, room: room || undefined,
    };
    try {
      if (isEdit && editingEntry) {
        await updateEntry({ id: editingEntry.id, body }).unwrap();
        toast.success('Period updated');
      } else {
        await createEntry(body).unwrap();
        toast.success('Period added');
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || `Could not ${isEdit ? 'update' : 'add'} period`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[420px]">
        <form onSubmit={submit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Period' : 'Add Period'}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="period-day">Day</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger id="period-day"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start">Start</Label>
                <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end">End</Label>
                <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="period-subject">Subject</Label>
              {/* Radix Select can't have an item with an empty-string value,
                  so "no subject" uses a 'none' sentinel translated back to
                  '' at the state boundary — same pattern as Academic Terms &
                  Grading's "no parent academic year" option. */}
              <Select value={subjectId || 'none'} onValueChange={(v) => setSubjectId(v === 'none' ? '' : v)}>
                <SelectTrigger id="period-subject"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject (free period / break)</SelectItem>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code ? `${s.code} — ${s.name}` : s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {subjects.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No subjects are set up for this class yet — add some from the Subjects page first.
                </p>
              )}
            </div>
            <div>
              <Label>Teacher</Label>
              {/* Read-only: the teacher is always auto-resolved server-side
                  from the subject's class+section assignment. Nothing here
                  is client-editable — the backend silently ignores a
                  teacherId even if one were sent. */}
              <div className="flex min-h-10 items-center rounded-lg border border-dashed border-input bg-muted/40 px-2.5 py-2 text-sm">
                {subjectId ? (
                  resolvedTeacherName ? (
                    <span className="text-foreground">Teacher: <span className="font-medium">{resolvedTeacherName}</span> — from Subject assignment</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-warning">
                      <AlertTriangle size={13} className="shrink-0" /> This subject has no assigned teacher yet
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground">No subject selected — no teacher to resolve</span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                To change who teaches this, update the teacher assignment on the{' '}
                <a href="/admin/subjects" className="underline underline-offset-2 hover:text-foreground">Subjects page</a>{' '}
                instead — it isn&apos;t set per period here.
              </p>
            </div>
            <div>
              <Label htmlFor="room">Room (optional)</Label>
              <Input id="room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room 12" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>{isEdit ? 'Save changes' : 'Add period'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface CopyResult {
  targetDay: string;
  period: string;
  status: 'ok' | 'skipped';
  reason?: string;
}

/** Copies every period from one day onto a multi-select of other days.
 *  Runs create() per (period × target day), never sending teacherId — the
 *  backend re-resolves the teacher independently for each target day/section
 *  anyway. Best-effort: one failing entry (e.g. a time conflict on that day)
 *  doesn't stop the rest, and every outcome is collected into a result
 *  summary shown afterwards. */
function CopyDayDialog({
  open, onClose, sourceDayIdx, entries, classId, sectionId,
}: {
  open: boolean;
  onClose: () => void;
  sourceDayIdx: number;
  entries: TimetableEntry[];
  classId: string;
  sectionId: string;
}) {
  const [createEntry] = useCreateEntryMutation();
  const [targets, setTargets] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CopyResult[] | null>(null);

  useEffect(() => {
    if (open) { setTargets(new Set()); setResults(null); }
  }, [open, sourceDayIdx]);

  const toggle = (idx: number) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const run = async () => {
    if (targets.size === 0) return;
    setRunning(true);
    const out: CopyResult[] = [];
    for (const targetDay of targets) {
      for (const period of entries) {
        const label = `${period.startTime}–${period.endTime} ${period.subject ?? '(no subject)'}`;
        try {
          await createEntry({
            classId, sectionId, dayOfWeek: targetDay,
            startTime: period.startTime, endTime: period.endTime,
            subjectId: period.subjectId ?? undefined,
            room: period.room ?? undefined,
          }).unwrap();
          out.push({ targetDay: DAYS[targetDay], period: label, status: 'ok' });
        } catch (err: any) {
          out.push({
            targetDay: DAYS[targetDay],
            period: label,
            status: 'skipped',
            reason: err?.data?.error?.message || err?.data?.message || 'Could not create this period',
          });
        }
      }
    }
    setRunning(false);
    setResults(out);
    const okCount = out.filter((r) => r.status === 'ok').length;
    const skipCount = out.length - okCount;
    if (skipCount === 0) toast.success(`Copied ${okCount} period${okCount === 1 ? '' : 's'}`);
    else toast(`Copied ${okCount}, skipped ${skipCount} — see details`, { icon: '⚠️' });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Copy size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">
              Copy {DAYS[sourceDayIdx]} to other days
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            Copies all {entries.length} period{entries.length === 1 ? '' : 's'} from {DAYS[sourceDayIdx]} onto the days
            you pick below. The teacher for each period is resolved automatically per day — it isn&apos;t copied
            as-is. Periods that conflict with something already on a target day will be skipped, not overwritten.
          </DialogPrimitive.Description>

          {!results ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {DAYS.map((day, idx) => (
                  idx === sourceDayIdx ? null : (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggle(idx)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                        targets.has(idx)
                          ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {day}
                      {targets.has(idx) && <Check size={14} />}
                    </button>
                  )
                ))}
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button type="button" size="sm" loading={running} disabled={targets.size === 0} onClick={run}>
                  Copy to {targets.size || ''} day{targets.size === 1 ? '' : 's'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${r.status === 'ok' ? 'border-border' : 'border-warning/40 bg-warning/5'}`}>
                    {r.status === 'ok' ? (
                      <Check size={13} className="mt-0.5 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{r.targetDay} — {r.period}</p>
                      {r.reason && <p className="text-muted-foreground">{r.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-end">
                <Button type="button" size="sm" onClick={onClose}>Done</Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
