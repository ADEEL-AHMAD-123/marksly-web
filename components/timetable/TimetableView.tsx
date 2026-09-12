'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  CalendarClock, Plus, Trash2, X, Clock, MapPin, AlertTriangle, Pencil, Printer, Copy, Check, Info, CalendarOff,
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
import {
  useGetHolidaysQuery, useCreateHolidayMutation, useDeleteHolidayMutation, type Holiday,
} from '@/store/api/holidaysApi';
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

/** Inverse of toMinutes() — used to suggest a sensible start/end time for a
 *  brand-new row added after the last one (see "Add a new row" below the
 *  grid), clamped to a valid time-of-day so a very-late last period doesn't
 *  suggest something past midnight. */
function minutesToTime(total: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

/** Which days to actually render as columns/sections: Monday through
 *  Saturday always — most schools here run a 6-day week, and a day with no
 *  periods yet still needs to be visible so there's somewhere to add its
 *  first one directly in the grid. Sunday only if it actually has at least
 *  one period, so an institution that's always closed Sunday doesn't get a
 *  permanently-empty extra column. */
function useVisibleDays(entries: TimetableEntry[]) {
  return useMemo(() => {
    const hasEntries = new Set(entries.map((e) => e.dayOfWeek));
    return DAYS.map((day, idx) => ({ day, idx }))
      .filter(({ idx }) => (idx >= 1 && idx <= 6) || hasEntries.has(idx));
  }, [entries]);
}

/** One color per subject, cycling through the theme's 5-color chart
 *  palette (already used for grade-distribution/analytics charts — see
 *  charts.tsx) so a section's grid reads at a glance instead of every
 *  period looking like the same plain card. Deterministic by subjectId (or
 *  subject name, for legacy periods with no subjectId) so the same subject
 *  always lands on the same color across the whole grid and across
 *  reloads, without needing to persist a color choice anywhere. Written as
 *  a fixed array of complete literal class names — not a template string
 *  built from the hashed index — because Tailwind only generates the
 *  utility classes it can find as complete strings in the source. */
const SUBJECT_PALETTE = [
  { bg: 'bg-chart-1/10', border: 'border-chart-1/40', text: 'text-chart-1', dot: 'bg-chart-1' },
  { bg: 'bg-chart-2/10', border: 'border-chart-2/40', text: 'text-chart-2', dot: 'bg-chart-2' },
  { bg: 'bg-chart-3/10', border: 'border-chart-3/40', text: 'text-chart-3', dot: 'bg-chart-3' },
  { bg: 'bg-chart-4/10', border: 'border-chart-4/40', text: 'text-chart-4', dot: 'bg-chart-4' },
  { bg: 'bg-chart-5/10', border: 'border-chart-5/40', text: 'text-chart-5', dot: 'bg-chart-5' },
];

function subjectColorClasses(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}

// A default first row shown when a section has no periods at all yet, so
// the grid itself — days across, an empty slot under each — is what a
// blank timetable looks like, not a plain "click the button above" empty
// state with no grid in sight. Every cell in this synthetic row opens the
// add-period drawer prefilled with this same starting time, same as a real
// row's empty cells; once any period is actually added, this row is
// replaced by whatever real time rows come out of useTimeRows().
const STARTER_ROW: TimeRow = { members: new Set(['09:00-09:45']), startTime: '09:00', endTime: '09:45' };

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
  // Set when an empty CELL in the grid is clicked (as opposed to the
  // header "+"/"Add period" button) — prefills both the day AND that row's
  // time range, since the whole point of clicking a specific empty cell is
  // "add a period right here," not just "add a period on this day
  // somewhere." Undefined (→ PeriodDrawer's own 09:00/09:45 default) when
  // opened any other way.
  const [addTimeRange, setAddTimeRange] = useState<{ startTime: string; endTime: string } | undefined>(undefined);
  const [copyDayIdx, setCopyDayIdx] = useState<number | null>(null);
  // Deleting a period used to happen the instant the trash icon was
  // clicked — a single misclick permanently removed a real, possibly
  // long-standing period with no chance to reconsider and no explanation
  // of what that actually does (attendance-taking for that slot, in
  // particular, since it depends on the period existing). Now the click
  // only stages the entry here; DeletePeriodDialog below is what actually
  // calls the mutation, after showing exactly what's about to happen.
  const [pendingDelete, setPendingDelete] = useState<TimetableEntry | null>(null);
  const [deleteEntry, { isLoading: deleting }] = useDeleteEntryMutation();
  const [holidaysOpen, setHolidaysOpen] = useState(false);

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
  const realTimeRows = useTimeRows(entries);
  // Fall back to one synthetic starter row so the grid itself is what an
  // empty timetable looks like — see STARTER_ROW's own comment.
  const timeRows = realTimeRows.length > 0 ? realTimeRows : [STARTER_ROW];
  // One extra blank row always rendered right after the last real one —
  // same look as any other row, with the same empty-cell "+" buttons in
  // every day's column — so starting a genuinely new time slot (an 8th
  // period after a week that's only ever had 7, say) is just clicking a
  // cell like anywhere else in the grid, not a separate link or button
  // that looks different from the rest of the table. Its suggested time is
  // the last row's end time plus a standard 45-minute period, purely as a
  // starting point — every cell in it still opens the drawer with that
  // day's own time editable, same as clicking any other empty cell.
  const nextBlankRow = useMemo(() => {
    const last = timeRows[timeRows.length - 1];
    const startTime = last.endTime;
    const endTime = minutesToTime(toMinutes(last.endTime) + 45);
    return { members: new Set([`${startTime}-${endTime}`]), startTime, endTime };
  }, [timeRows]);
  const displayRows = useMemo(() => [...timeRows, nextBlankRow], [timeRows, nextBlankRow]);

  const byDay = useMemo(() => {
    const m: Record<number, TimetableEntry[]> = {};
    for (const e of entries) (m[e.dayOfWeek] ??= []).push(e);
    return m;
  }, [entries]);

  const cellFor = (dayIdx: number, row: { members: Set<string> }) =>
    (byDay[dayIdx] ?? []).find((e) => row.members.has(`${e.startTime}-${e.endTime}`)) ?? null;

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    try {
      await deleteEntry(pendingDelete.id).unwrap();
      toast.success('Period removed');
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Could not remove period');
    }
  };

  const openEdit = (entry: TimetableEntry) => setEditEntry(entry);
  const openAdd = (day: string, timeRange?: { startTime: string; endTime: string }) => {
    setAddDay(day);
    setAddTimeRange(timeRange);
    setAddOpen(true);
  };
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
            <Button variant="secondary" size="sm" className="no-print" onClick={() => setHolidaysOpen(true)}>
              <CalendarOff size={16} /> Holidays
            </Button>
            <Button size="sm" className="no-print" onClick={() => openAdd('1')}>
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
      ) : (
        <>
          <style dangerouslySetInnerHTML={{ __html: TIMETABLE_PRINT_CSS }} />

          {/* Shown only until the very first period exists — the grid
              itself (below, with every day already a column and every
              cell already clickable) is the actual "getting started"
              experience, not a separate empty-state card standing in for
              it. */}
          {entries.length === 0 && (
            <div className="no-print flex items-center gap-2.5 rounded-lg border border-dashed border-primary/30 bg-primary-soft/30 px-3.5 py-3 text-sm text-primary-soft-foreground">
              <CalendarClock size={16} className="shrink-0" />
              This section&apos;s timetable is empty — click any slot below (any day, including {DAYS[6]}) to add its
              first period right there.
            </div>
          )}

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
                          <div className="flex items-center justify-between gap-1">
                            <span>{day}</span>
                            {/* Previously a single unlabeled icon hiding
                                both "add" and "copy" behind a menu — easy to
                                never notice, and unclear what it even did
                                once found. Now two separate, always-visible,
                                titled buttons: a "+" that does the obvious
                                thing directly, and a "⋮" for the one action
                                that genuinely needs a menu. */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                title={`Add a period on ${day}`}
                                aria-label={`Add a period on ${day}`}
                                onClick={() => openAdd(String(idx))}
                                className="no-print rounded-md p-1 font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Plus size={14} />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    title={`Copy ${day} to other days`}
                                    aria-label={`More actions for ${day}`}
                                    className="no-print rounded-md p-1 font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <Copy size={13} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    disabled={(byDay[idx] ?? []).length === 0}
                                    onClick={() => setCopyDayIdx(idx)}
                                  >
                                    <Copy size={14} /> Copy {day} to other days
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row) => (
                      <tr key={Array.from(row.members).sort().join('|')} className="border-b border-border last:border-b-0">
                        <td className="border-r border-border px-3 py-2 align-top text-xs font-medium text-foreground">
                          {row.startTime}–{row.endTime}
                        </td>
                        {visibleDays.map(({ day, idx }) => {
                          const entry = cellFor(idx, row);
                          const entryTimeDiffers = entry
                            && (entry.startTime !== row.startTime || entry.endTime !== row.endTime);
                          // A period with no subject attached is a genuine
                          // "free period" (a study hall, break, or gap left
                          // on purpose) — styled as its own dashed/muted
                          // look rather than a color from the subject
                          // palette, so it reads as deliberately empty
                          // rather than as just another subject or as a
                          // problem needing attention (unlike "No teacher"
                          // below, which is a real gap worth flagging).
                          const color = entry?.subjectId ? subjectColorClasses(entry.subjectId) : null;
                          return (
                            <td key={day} className="border-r border-border px-2 py-1.5 align-top last:border-r-0">
                              {entry ? (
                                <div
                                  className={
                                    color
                                      ? `group relative rounded-lg border ${color.border} ${color.bg} p-2 transition-colors hover:brightness-95`
                                      : 'group relative rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-2 transition-colors hover:border-muted-foreground/50'
                                  }
                                >
                                  <button
                                    type="button"
                                    onClick={() => openEdit(entry)}
                                    className="block w-full text-left"
                                  >
                                    {entryTimeDiffers && (
                                      <p className="truncate text-[10px] font-medium text-muted-foreground">{entry.startTime}–{entry.endTime}</p>
                                    )}
                                    <p className={`flex items-center gap-1.5 truncate text-xs font-semibold ${color ? 'text-foreground' : 'text-muted-foreground'}`}>
                                      {color && <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />}
                                      {entry.subject ?? 'Free period'}
                                    </p>
                                    {entry.teacher ? (
                                      <p className="truncate text-[11px] text-muted-foreground">{entry.teacher}</p>
                                    ) : entry.subjectId ? (
                                      <p className="flex items-center gap-1 truncate text-[11px] text-warning">
                                        <AlertTriangle size={10} className="shrink-0" /> No teacher
                                      </p>
                                    ) : null}
                                    {entry.room && (
                                      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                        <MapPin size={9} className="shrink-0" /> {entry.room}
                                      </p>
                                    )}
                                  </button>
                                  {/* Previously hidden until hover (group-hover:flex) — invisible
                                      by default on touch/tablet screens and easy for a first-time
                                      admin to never discover at all on desktop either. Always visible
                                      now, just subdued until hovered, so the controls are noticeable
                                      without making every cell look busy. */}
                                  <div className="no-print absolute right-1 top-1 flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                                    <button
                                      type="button"
                                      title="Edit period"
                                      aria-label="Edit period"
                                      onClick={() => openEdit(entry)}
                                      className="rounded-md bg-card p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      title="Remove period"
                                      aria-label="Remove period"
                                      onClick={() => setPendingDelete(entry)}
                                      className="rounded-md bg-card p-1 text-muted-foreground shadow-sm hover:bg-danger-soft hover:text-danger"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Previously just an empty <div> with no way
                                // to add a period at this exact day/time —
                                // the only options were the header's generic
                                // "Add period" (always defaults to Monday)
                                // or a day's own "Add period on {day}" menu
                                // item (defaults to 09:00), neither of which
                                // prefill the row's actual time. Clicking an
                                // empty cell now opens the drawer with both
                                // this day AND this row's time range already
                                // filled in.
                                <button
                                  type="button"
                                  onClick={() => openAdd(String(idx), { startTime: row.startTime, endTime: row.endTime })}
                                  title={`Add a period on ${day} at ${row.startTime}`}
                                  aria-label={`Add period on ${day} at ${row.startTime}`}
                                  className="no-print flex h-full min-h-[2.5rem] w-full items-center justify-center rounded-lg text-muted-foreground/0 transition-colors hover:bg-muted hover:text-muted-foreground"
                                >
                                  <Plus size={14} />
                                </button>
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
                          onClick={() => openAdd(String(idx))}
                          title={`Add a period on ${day}`}
                          aria-label={`Add period on ${day}`}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Plus size={15} />
                        </button>
                        {periods.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCopyDayIdx(idx)}
                            title={`Copy ${day} to other days`}
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
                        {periods.map((e) => {
                          const color = e.subjectId ? subjectColorClasses(e.subjectId) : null;
                          return (
                            <li
                              key={e.id}
                              className={
                                color
                                  ? `flex items-center gap-3 rounded-lg border ${color.border} ${color.bg} p-2.5`
                                  : 'flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-2.5'
                              }
                            >
                              <span className="flex items-center gap-1 text-xs font-medium text-foreground"><Clock size={12} /> {e.startTime}–{e.endTime}</span>
                              <div className="min-w-0 flex-1">
                                <p className={`flex items-center gap-1.5 truncate text-sm font-medium ${color ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {color && <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />}
                                  {e.subject ?? 'Free period'}
                                </p>
                                {e.teacher ? (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {e.teacher}{e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                                  </p>
                                ) : e.subjectId ? (
                                  <p className="flex items-center gap-1 truncate text-xs text-warning">
                                    <AlertTriangle size={11} className="shrink-0" /> No teacher assigned
                                    {e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                                  </p>
                                ) : e.room ? (
                                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                    <MapPin size={10} className="shrink-0" /> {e.room}
                                  </p>
                                ) : null}
                              </div>
                              <button onClick={() => openEdit(e)} title="Edit period" aria-label="Edit period" className="no-print rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
                              <button onClick={() => setPendingDelete(e)} title="Remove period" aria-label="Remove period" className="no-print rounded-lg p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"><Trash2 size={15} /></button>
                            </li>
                          );
                        })}
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
          <p>
            Each subject gets its own color in the grid above, so a busy week reads at a glance — the same subject
            always shows the same color everywhere it appears. A dashed, uncolored slot is a deliberate{' '}
            <strong>free period</strong> (no subject picked when it was added) rather than a subject with a color;
            a solid slot with a yellow &quot;No teacher&quot; note is a real gap worth fixing — that subject has no
            teacher assigned yet on the Subjects page.
          </p>
          <p>
            Hover any period for its edit (pencil) and remove (trash) icons — removing one always asks you to
            confirm first and explains what it affects, so it can&apos;t happen by accident. Each day&apos;s column
            header has its own <strong>+</strong> (add a period there) and copy icon (copy that day&apos;s whole
            schedule onto other days) buttons. There&apos;s always one extra blank row waiting right after the last
            one — every cell in it works exactly like any other empty cell, so starting a brand-new time slot (an
            8th period after a week that&apos;s only ever had 7, say) never needs a different button to find.
          </p>
          <p>
            <strong>Why is there no teacher field to fill in?</strong> A period&apos;s teacher is never set here —
            it&apos;s always resolved automatically from whichever teacher the Subject is assigned to for that{' '}
            {terminology.classUnit.toLowerCase()} and {sectionLabel.toLowerCase()}, shown read-only when you add or
            edit a period. To change who teaches a period, update the teacher assignment on the{' '}
            <strong>Subjects</strong> page instead — every period using that subject picks up the change
            automatically, nothing needs to be re-saved here.
          </p>
          <p>
            <strong>Why did adding or editing a period get rejected?</strong> Two periods can&apos;t overlap for the
            same {sectionLabel.toLowerCase()} — you&apos;ll be told to pick a different time or day. A period can
            also be rejected if its teacher is already teaching a different {sectionLabel.toLowerCase()} at an
            overlapping time, even on a different {terminology.classUnit.toLowerCase()} — one teacher can&apos;t be
            in two places at once, so the earlier assignment needs to move first.
          </p>
          <p>
            <strong>Why does {DAYS[6]} always show, but not {DAYS[0]}?</strong> Monday through {DAYS[6]} are always
            shown as columns — even with nothing in them yet — since most schools here run a six-day week and need
            somewhere to add that first period. {DAYS[0]} only appears once at least one period is actually added to
            it, so an institution that&apos;s always closed on {DAYS[0]} doesn&apos;t get a permanently empty column.
          </p>
          <p>
            <strong>What actually happens when you copy a day to others?</strong> Every period from that day is
            recreated on each day you pick, at the same time and with the same subject — the teacher isn&apos;t
            copied over directly, it&apos;s re-resolved from the Subject&apos;s assignment the same way a brand-new
            period would be, so it can never end up stale even if the assignment changes later. Any period that
            would conflict with something already on a target day is skipped (never overwritten), and you&apos;ll
            see exactly which ones in the results afterward.
          </p>
          <p>
            <strong>Marking a specific date off?</strong> Use the <strong>Holidays</strong> button above the grid —
            it closes a real calendar date (a public holiday, a weather closure, a staff-training day), either for
            the whole institution or just this {terminology.classUnit.toLowerCase()} and {sectionLabel.toLowerCase()}.
            It doesn&apos;t touch the weekly schedule below at all — Monday&apos;s periods stay exactly as built —
            it only stops attendance from being taken on that date until the holiday is removed again.
          </p>
        </InfoNote>
      </div>

      <PeriodDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classId={classId}
        sectionId={sectionId}
        initialDay={addDay}
        initialStartTime={addTimeRange?.startTime}
        initialEndTime={addTimeRange?.endTime}
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
      <DeletePeriodDialog
        entry={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmRemove}
        loading={deleting}
      />
      {holidaysOpen && (
        <HolidaysDialog
          open={holidaysOpen}
          onClose={() => setHolidaysOpen(false)}
          classId={classId}
          sectionId={sectionId}
          className={selectedClass?.name ?? ''}
          sectionName={sections.find((s) => s.id === sectionId)?.name ?? ''}
        />
      )}
    </div>
  );
}

const AUDIENCE_LABEL: Record<Holiday['audience'], string> = {
  everyone: 'Everyone (school closed)',
  students: 'Students only (staff still in)',
  staff: 'Staff only (students still in)',
};

/**
 * Marking a date off is deliberately separate from the grid above it — a
 * holiday doesn't touch the weekly schedule at all (Monday's periods stay
 * exactly as built), it's a date-level exception layered on top: any
 * period that would otherwise run on that date just can't have attendance
 * taken against it while the holiday exists (see marksly-api's
 * attendance.helpers.ts loadPeriod()). Removing the holiday later reopens
 * attendance for that date immediately, with nothing else to undo.
 */
function HolidaysDialog({
  open, onClose, classId, sectionId, className, sectionName,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
}) {
  const { data, isFetching } = useGetHolidaysQuery({ classId, sectionId }, { skip: !open });
  const holidays = data?.data ?? [];
  const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
  const [deleteHoliday, { isLoading: removing }] = useDeleteHolidayMutation();

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<'institution' | 'class'>('institution');
  const [audience, setAudience] = useState<Holiday['audience']>('everyone');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setDate(''); setReason(''); setScope('institution'); setAudience('everyone'); setConfirmingId(null); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason.trim()) { toast.error('Date and reason are both required'); return; }
    try {
      await createHoliday({
        date, reason: reason.trim(), scope, audience,
        ...(scope === 'class' ? { classId, sectionId } : {}),
      }).unwrap();
      toast.success('Holiday added');
      setDate(''); setReason('');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Could not add holiday');
    }
  };

  const remove = async (id: string) => {
    try { await deleteHoliday(id).unwrap(); toast.success('Holiday removed'); setConfirmingId(null); }
    catch (err: any) { toast.error(err?.data?.error?.message || 'Could not remove holiday'); }
  };

  const sorted = holidays.slice().sort((a, b) => a.date.localeCompare(b.date));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                <CalendarOff size={16} />
              </span>
              <DialogPrimitive.Title className="text-base font-semibold">Holidays &amp; days off</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
            Marks a specific date closed. The weekly schedule below isn&apos;t touched — this only stops attendance
            from being taken on that date until it&apos;s removed.
          </DialogPrimitive.Description>

          <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="holiday-date">Date</Label>
                <Input id="holiday-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="holiday-reason">Reason</Label>
                <Input
                  id="holiday-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Public Holiday"
                  maxLength={200}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Applies to</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('institution')}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    scope === 'institution' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border hover:bg-muted'
                  }`}
                >
                  Whole institution
                </button>
                <button
                  type="button"
                  onClick={() => setScope('class')}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    scope === 'class' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border hover:bg-muted'
                  }`}
                >
                  Just {className || 'this class'}{sectionName ? ` — ${sectionName}` : ''}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="holiday-audience">Who&apos;s off</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Holiday['audience'])}>
                <SelectTrigger id="holiday-audience"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(AUDIENCE_LABEL) as Holiday['audience'][]).map((a) => (
                    <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {audience === 'staff' && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  There&apos;s no staff attendance tracking in Marksly yet, so this is for the record only — it
                  won&apos;t change anything else automatically. &quot;Students only&quot; and &quot;Everyone&quot;
                  do actively stop attendance being taken that day.
                </p>
              )}
            </div>

            {/* A live "what this will actually do" preview, in the same
                spirit as DeletePeriodDialog above — an admin should know
                exactly what happens BEFORE clicking Add, not discover it
                afterward. Updates as scope/audience change since the two
                genuinely different outcomes (a broadcast notice vs. a
                purely internal record) aren't obvious just from the form's
                own labels. */}
            <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary-soft/25 px-3 py-2.5 text-xs text-primary-soft-foreground">
              <Info size={13} className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p>
                  {audience === 'staff' ? (
                    <>Attendance is <strong>not</strong> affected — students stay markable as normal.</>
                  ) : (
                    <>
                      Teachers won&apos;t be able to take attendance for {scope === 'institution' ? 'any class' : `${className || 'this class'}${sectionName ? ` — ${sectionName}` : ''}`} on this date
                      once it&apos;s added.
                    </>
                  )}
                </p>
                <p>
                  {scope === 'institution' ? (
                    <>
                      A notice will be sent to {audience === 'everyone' ? 'everyone' : audience === 'students' ? 'students, parents, and teachers' : 'teachers, staff, and accountants'} —
                      it&apos;ll show up right on their dashboard.
                    </>
                  ) : (
                    <>No notice is sent for a class-specific closure — it only shows up here, on this class&apos;s own Timetable page.</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={creating}>Add holiday</Button>
            </div>
          </form>

          <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto">
            {isFetching ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
            ) : sorted.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No holidays added yet.</p>
            ) : (
              sorted.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {h.date} — {h.reason}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.scope === 'institution' ? 'Whole institution' : `${h.className ?? 'This class'}${h.section ? ` — ${h.section}` : ''}`}
                      {' · '}{AUDIENCE_LABEL[h.audience]}
                    </p>
                  </div>
                  {confirmingId === h.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-muted-foreground">Remove?</span>
                      <Button type="button" size="sm" variant="danger" loading={removing} onClick={() => remove(h.id)}>Yes</Button>
                      <Button type="button" size="sm" variant="ghost" disabled={removing} onClick={() => setConfirmingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Remove this holiday"
                      aria-label="Remove this holiday"
                      onClick={() => setConfirmingId(h.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Removing a period used to happen the instant the trash icon was clicked —
 * no confirmation, and nothing telling the admin what it would actually do.
 * This shows the exact period being removed plus the two real-world
 * consequences that matter here: teachers immediately lose the ability to
 * take attendance for that slot (attendance is always taken against a
 * specific period, never just a date — see the InfoNote at the bottom of
 * the page), while any attendance already recorded for it in the past stays
 * exactly as it is, since it's stored independently and doesn't depend on
 * the period still existing.
 */
function DeletePeriodDialog({
  entry, onClose, onConfirm, loading,
}: {
  entry: TimetableEntry | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <DialogPrimitive.Root open={!!entry} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
        >
          {entry && (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <Trash2 size={16} />
                </span>
                <div className="min-w-0">
                  <DialogPrimitive.Title className="text-base font-semibold">Remove this period?</DialogPrimitive.Title>
                  <DialogPrimitive.Description asChild>
                    <div className="mt-1.5 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground">
                        <span className="font-medium">{DAYS[entry.dayOfWeek]}, {entry.startTime}–{entry.endTime}</span>
                        {' — '}
                        {entry.subject ?? 'Free period'}
                        {entry.teacher ? ` · ${entry.teacher}` : ''}
                        {entry.room ? ` · ${entry.room}` : ''}
                      </p>
                      <p>
                        This slot disappears from the timetable immediately — teachers will no longer see it to{' '}
                        <strong>take attendance</strong> against, starting right away. This can&apos;t be undone; if
                        it was a mistake, you&apos;ll need to add the period back manually.
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Info size={13} className="mt-0.5 shrink-0" />
                        Attendance already recorded for this period in the past is <strong>not affected</strong> — it
                        stays exactly as it is either way.
                      </p>
                    </div>
                  </DialogPrimitive.Description>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>Remove period</Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PeriodDrawer({
  open, onClose, classId, sectionId, initialDay, initialStartTime, initialEndTime, editingEntry,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  sectionId: string;
  initialDay: string;
  // Set when opened by clicking an empty grid cell (as opposed to the
  // header/day-menu "Add period", which has no specific time in mind) —
  // prefills the row's own time range instead of the generic 09:00-09:45
  // default.
  initialStartTime?: string;
  initialEndTime?: string;
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
      setStartTime(initialStartTime ?? '09:00');
      setEndTime(initialEndTime ?? '09:45');
      setSubjectId('');
      setRoom('');
    }
  }, [open, initialDay, initialStartTime, initialEndTime, editingEntry]);

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
