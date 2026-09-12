'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, XCircle, AlarmClock, UserX, Layers, CalendarCheck,
  ChevronDown, ChevronUp, Search,
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

// Below this many classes, a search box is more friction than help — a
// small school can just scan the list. Above it, scanning stops working
// and jumping straight to one class by name is what an admin actually
// wants.
const SEARCH_THRESHOLD = 15;

/**
 * Replaces the old institution-wide present/absent donut chart. That chart
 * answered "what % of marked students were present" but silently said
 * nothing about sections that hadn't marked attendance AT ALL — a school
 * where half the teachers forgot to mark attendance could still show a
 * reassuring "92% present" based only on the half that did. An admin's
 * actual job here is knowing which classes/sections still need chasing, not
 * just a single blended percentage — so this leads with coverage
 * (X of Y sections marked) and then, in the body, puts whatever still
 * needs attention front and center: unmarked sections grouped by class,
 * full visual weight. Classes that are fully marked collapse into a single
 * summary line by default — a school with 30+ classes fully marked by noon
 * would otherwise force the admin to scroll past a wall of green pills to
 * find the handful still outstanding, and re-invert that once a search
 * query is typed (see `filterMatches` below) since a searched class should
 * always show in full regardless of its state.
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

  const { needsAttention, fullyMarked } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const classes = (coverage?.classes ?? [])
      .map((c) => ({ ...c, sections: [...c.sections].sort((a, b) => Number(a.marked) - Number(b.marked)) }))
      .filter((c) => !q || c.className.toLowerCase().includes(q));
    return {
      needsAttention: classes.filter((c) => c.sections.some((s) => !s.marked)),
      fullyMarked: classes.filter((c) => c.sections.every((s) => s.marked)),
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
          {!loading && totalSections > 0 && !readOnly && coverage!.unmarkedSections > 0 && (
            <Button variant="secondary" size="sm" onClick={() => onMarkAttendance()}>
              <CalendarCheck size={15} /> Mark attendance
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
          <div className="space-y-4">
            {markedStudents > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <AttendanceMiniStat icon={CheckCircle2} label="Present" value={coverage!.present} tone="success" />
                <AttendanceMiniStat icon={XCircle} label="Absent" value={coverage!.absent} tone="danger" />
                <AttendanceMiniStat icon={AlarmClock} label="Late" value={coverage!.late} tone="warning" />
                <AttendanceMiniStat icon={UserX} label="Leave" value={coverage!.leave} tone="muted" />
              </div>
            )}

            {showSearch && (
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Find a ${terminology.classUnit.toLowerCase()}…`}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
                />
              </div>
            )}

            {/* Needs attention — full visual weight, always shown first.
                This is the actual job here: knowing what still needs
                chasing, not scanning past a wall of already-done pills. */}
            {needsAttention.length > 0 ? (
              <div className="space-y-4">
                {needsAttention.map((c) => (
                  <ClassRow key={c.classId} c={c} readOnly={readOnly} onMarkAttendance={onMarkAttendance} />
                ))}
              </div>
            ) : !isSearching && classCount > 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
                <CheckCircle2 size={16} className="shrink-0" /> All {terminology.sectionPlural.toLowerCase()} marked for today
              </div>
            ) : null}

            {/* Fully marked — collapsed into one summary line by default so
                it never buries what's actually outstanding. Expands on
                request, and auto-expands (in full) while searching so a
                searched-for class is never hidden behind the toggle. */}
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
                  <div className="mt-2 max-h-60 space-y-4 overflow-y-auto">
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

type CoverageClass = AttendanceCoverageClass;

function ClassRow({
  c,
  readOnly,
  onMarkAttendance,
}: {
  c: CoverageClass;
  readOnly: boolean;
  onMarkAttendance: (target?: { classId: string; sectionId: string }) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.className}</p>
      <div className="flex flex-wrap gap-1.5">
        {c.sections.map((s) => (
          <button
            key={s.sectionId}
            type="button"
            disabled={readOnly}
            title={readOnly ? undefined : s.marked ? `Review ${c.className} — ${s.sectionName}` : `Mark ${c.className} — ${s.sectionName}`}
            onClick={() => onMarkAttendance({ classId: c.classId, sectionId: s.sectionId })}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              s.marked ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning',
              !readOnly && 'hover:brightness-95'
            )}
          >
            {s.marked ? <CheckCircle2 size={12} /> : <Clock size={12} />}
            {s.sectionName}
            {s.marked ? (
              <span className="text-muted-foreground">· {s.present}/{s.present + s.absent + s.late + s.leave}</span>
            ) : s.periodsScheduled > 0 ? (
              <span>· {s.periodsMarked}/{s.periodsScheduled} periods</span>
            ) : (
              <span>· not marked</span>
            )}
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
