'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, XCircle, AlarmClock, UserX, Layers, CalendarCheck,
  ChevronDown, ChevronUp, Search, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTerminology } from '@/lib/terminology';
import type { AttendanceCoverage, AttendanceCoverageClass } from '@/store/api/attendanceApi';

// Below this many classes, scanning the whole list works fine and a search
// box is more friction than help. Past it, a school's list is genuinely
// too long to scan and jumping straight to a class by name is what an
// admin actually needs — kept low (not the old 15) because even a
// one-line-per-class list gets tall well before 15.
const SEARCH_THRESHOLD = 8;

/**
 * Replaces the old institution-wide present/absent donut chart. That chart
 * answered "what % of marked students were present" but silently said
 * nothing about sections that hadn't marked attendance AT ALL — a school
 * where half the teachers forgot to mark attendance could still show a
 * reassuring "92% present" based only on the half that did. An admin's
 * actual job here is knowing which classes/sections still need chasing.
 *
 * Rebuilt (2nd pass) around a school with 30-40 classes, which the
 * previous version — one heading + a full row of pills per class, always
 * rendered — still didn't handle: even with fully-marked classes
 * collapsed, an unmarked list of 15-20 classes was still a wall of
 * two-line blocks. This version uses ONE dense line per class (name +
 * inline section chips, no separate heading line), leads with a single
 * "Mark next" shortcut so the very first thing an admin sees is an action
 * they can take immediately rather than a list to parse, and shows the
 * search box much earlier since even a compact list gets long fast.
 */
export function TodaysAttendanceCard({
  coverage,
  loading,
  onMarkAttendance,
  // Staff has read-only backend access to attendance (roster/coverage) but
  // cannot mark it — see attendance.routes.ts's canRead vs. the marking
  // endpoint, which excludes staff. Reusing this card for a staff dashboard
  // with a button literally labeled "Mark attendance" would be actively
  // misleading (backend would reject the write), so `readOnly` swaps that
  // for a plain "View attendance" link that's always shown rather than only
  // when something's unmarked.
  readOnly = false,
}: {
  coverage: AttendanceCoverage | undefined;
  loading: boolean;
  // Optional target lets a specific section's pill jump straight into
  // marking THAT section, rather than always landing on the generic
  // attendance page and forcing a manual re-drill-down through class →
  // section → period for the exact thing the admin just clicked on.
  onMarkAttendance: (target?: { classId: string; sectionId: string }) => void;
  readOnly?: boolean;
}) {
  const terminology = useTerminology();
  const [query, setQuery] = useState('');
  const [showMarked, setShowMarked] = useState(false);

  const totalSections = coverage?.totalSections ?? 0;
  const markedSections = coverage?.markedSections ?? 0;
  const pct = totalSections > 0 ? Math.round((markedSections / totalSections) * 100) : 0;
  const markedStudents = (coverage?.present ?? 0) + (coverage?.absent ?? 0) + (coverage?.late ?? 0) + (coverage?.leave ?? 0);
  const classCount = coverage?.classes?.length ?? 0;
  const showSearch = classCount >= SEARCH_THRESHOLD;

  const { needsAttention, fullyMarked, firstUnmarked } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const classes = (coverage?.classes ?? [])
      .map((c) => ({ ...c, sections: [...c.sections].sort((a, b) => Number(a.marked) - Number(b.marked)) }))
      .filter((c) => !q || c.className.toLowerCase().includes(q));
    const needsAttention = classes.filter((c) => c.sections.some((s) => !s.marked));
    let firstUnmarked: { classId: string; sectionId: string; className: string; sectionName: string } | null = null;
    for (const c of needsAttention) {
      const s = c.sections.find((s) => !s.marked);
      if (s) { firstUnmarked = { classId: c.classId, sectionId: s.sectionId, className: c.className, sectionName: s.sectionName }; break; }
    }
    return {
      needsAttention,
      fullyMarked: classes.filter((c) => c.sections.every((s) => s.marked)),
      firstUnmarked,
    };
  }, [coverage?.classes, query]);

  // While actively searching, show everything that matches (marked or not)
  // rather than keeping a matched, fully-marked class hidden behind the
  // collapsed summary — the whole point of typing a class name is to find
  // it immediately.
  const isSearching = query.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Today&apos;s Attendance</CardTitle>
            <CardDescription>
              {loading
                ? 'Loading…'
                : totalSections === 0
                  ? `No ${terminology.classUnitPlural.toLowerCase()} with ${terminology.sectionPlural.toLowerCase()} yet`
                  : `${markedSections} of ${totalSections} ${(totalSections === 1 ? terminology.section : terminology.sectionPlural).toLowerCase()} marked · ${pct}% coverage`}
            </CardDescription>
          </div>
          {!loading && totalSections > 0 && readOnly && (
            <Button variant="secondary" size="sm" onClick={() => onMarkAttendance()}>
              <CalendarCheck size={15} /> View attendance
            </Button>
          )}
        </div>
        {!loading && totalSections > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-[width] duration-500 ease-out', pct === 100 ? 'bg-success' : 'bg-primary')}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : totalSections === 0 ? (
          <EmptyState
            icon={Layers}
            title={`No ${terminology.sectionPlural.toLowerCase()} to track yet`}
            description={`Once you've created ${terminology.classUnitPlural.toLowerCase()} and ${terminology.sectionPlural.toLowerCase()}, today's attendance coverage will show up here.`}
          />
        ) : (
          <div className="space-y-3">
            {markedStudents > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <AttendanceMiniStat icon={CheckCircle2} label="Present" value={coverage!.present} tone="success" />
                <AttendanceMiniStat icon={XCircle} label="Absent" value={coverage!.absent} tone="danger" />
                <AttendanceMiniStat icon={AlarmClock} label="Late" value={coverage!.late} tone="warning" />
                <AttendanceMiniStat icon={UserX} label="Leave" value={coverage!.leave} tone="muted" />
              </div>
            )}

            {/* The single most useful thing this card can offer at a
                glance: not a list to read, but the next thing to do. Only
                shown unfiltered (not mid-search, where the admin is
                looking for something specific instead). */}
            {!readOnly && !isSearching && firstUnmarked && (
              <button
                type="button"
                onClick={() => onMarkAttendance({ classId: firstUnmarked.classId, sectionId: firstUnmarked.sectionId })}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-left text-sm font-medium text-warning transition-colors hover:brightness-95"
              >
                <span className="flex items-center gap-2 truncate">
                  <Clock size={15} className="shrink-0" />
                  Mark next: <span className="truncate font-semibold">{firstUnmarked.className} — {firstUnmarked.sectionName}</span>
                </span>
                <ArrowRight size={15} className="shrink-0" />
              </button>
            )}

            {needsAttention.length === 0 && !isSearching && classCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
                <CheckCircle2 size={16} className="shrink-0" /> All {terminology.sectionPlural.toLowerCase()} marked for today
              </div>
            )}

            {showSearch && (
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Find a ${terminology.classUnit.toLowerCase()} (${classCount} total)…`}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
                />
              </div>
            )}

            {/* Needs attention — one dense row per class (name + inline
                section chips), not a heading-plus-pill-row per class. At
                20+ unmarked classes the old two-line-per-class layout was
                itself the wall of content; this fits roughly 2x as many
                rows in the same height and reads as a list, not a stack of
                cards. */}
            {needsAttention.length > 0 && (
              <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {needsAttention.map((c) => (
                  <ClassRow key={c.classId} c={c} readOnly={readOnly} onMarkAttendance={onMarkAttendance} />
                ))}
              </div>
            )}

            {/* Fully marked — collapsed into one summary line by default so
                it never competes for space with what's actually
                outstanding. Expands on request, and auto-expands while
                searching so a searched-for class is never hidden behind
                the toggle. */}
            {fullyMarked.length > 0 && (
              <div>
                {!isSearching && (
                  <button
                    type="button"
                    onClick={() => setShowMarked((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-success" />
                      {fullyMarked.length} {(fullyMarked.length === 1 ? terminology.classUnit : terminology.classUnitPlural).toLowerCase()} fully marked
                    </span>
                    {showMarked ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
                {(isSearching || showMarked) && (
                  <div className="mt-1 max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {fullyMarked.map((c) => (
                      <ClassRow key={c.classId} c={c} readOnly={readOnly} onMarkAttendance={onMarkAttendance} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {needsAttention.length === 0 && fullyMarked.length === 0 && isSearching && (
              <p className="py-4 text-center text-sm text-muted-foreground">No {terminology.classUnitPlural.toLowerCase()} match &quot;{query}&quot;.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * One dense line per class: name (fixed width, truncates), then every
 * section as a small inline chip. Replaces the old per-class heading +
 * full pill row, which cost two lines of vertical space per class — at
 * 30-40 classes that difference is the entire reason the card felt
 * unmanageable.
 */
function ClassRow({
  c,
  readOnly,
  onMarkAttendance,
}: {
  c: AttendanceCoverageClass;
  readOnly: boolean;
  onMarkAttendance: (target?: { classId: string; sectionId: string }) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="w-24 shrink-0 truncate font-medium text-foreground sm:w-32" title={c.className}>{c.className}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {c.sections.map((s) => (
          <button
            key={s.sectionId}
            type="button"
            disabled={readOnly}
            title={readOnly ? undefined : s.marked ? `Review ${c.className} — ${s.sectionName}` : `Mark ${c.className} — ${s.sectionName}`}
            onClick={() => onMarkAttendance({ classId: c.classId, sectionId: s.sectionId })}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
              s.marked ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning',
              !readOnly && 'hover:brightness-95'
            )}
          >
            {s.marked ? <CheckCircle2 size={11} /> : <Clock size={11} />}
            {s.sectionName}
            {!s.marked && s.periodsScheduled > 0 && <span>· {s.periodsMarked}/{s.periodsScheduled}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttendanceMiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning' | 'muted';
}) {
  const toneClass =
    tone === 'success' ? 'bg-success-soft text-success' :
    tone === 'danger' ? 'bg-danger-soft text-danger' :
    tone === 'warning' ? 'bg-warning-soft text-warning' :
    'bg-muted text-muted-foreground';
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneClass)}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{value.toLocaleString('en-PK')}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
