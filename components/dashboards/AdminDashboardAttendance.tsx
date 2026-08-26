'use client';

import {
  CheckCircle2, Clock, XCircle, AlarmClock, UserX, Layers, CalendarCheck,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AttendanceCoverage } from '@/store/api/attendanceApi';

/**
 * Replaces the old institution-wide present/absent donut chart. That chart
 * answered "what % of marked students were present" but silently said
 * nothing about sections that hadn't marked attendance AT ALL — a school
 * where half the teachers forgot to mark attendance could still show a
 * reassuring "92% present" based only on the half that did. An admin's
 * actual job here is knowing which classes/sections still need chasing, not
 * just a single blended percentage — so this leads with coverage
 * (X of Y sections marked) and lists every class's sections with a clear
 * marked/not-marked state, real present/absent/late/leave counts pulled
 * from `attendance/coverage-today` (see attendance.service.ts's
 * coverageToday()).
 */
export function TodaysAttendanceCard({
  coverage,
  loading,
  onMarkAttendance,
}: {
  coverage: AttendanceCoverage | undefined;
  loading: boolean;
  onMarkAttendance: () => void;
}) {
  const totalSections = coverage?.totalSections ?? 0;
  const markedSections = coverage?.markedSections ?? 0;
  const pct = totalSections > 0 ? Math.round((markedSections / totalSections) * 100) : 0;
  const markedStudents = (coverage?.present ?? 0) + (coverage?.absent ?? 0) + (coverage?.late ?? 0) + (coverage?.leave ?? 0);

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
                  ? 'No classes with sections yet'
                  : `${markedSections} of ${totalSections} section${totalSections === 1 ? '' : 's'} marked · ${pct}% coverage`}
            </CardDescription>
          </div>
          {!loading && totalSections > 0 && coverage!.unmarkedSections > 0 && (
            <Button variant="secondary" size="sm" onClick={onMarkAttendance}>
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
            title="No sections to track yet"
            description="Once you've created classes and sections, today's attendance coverage will show up here."
          />
        ) : (
          <div className="space-y-5">
            {markedStudents > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <AttendanceMiniStat icon={CheckCircle2} label="Present" value={coverage!.present} tone="success" />
                <AttendanceMiniStat icon={XCircle} label="Absent" value={coverage!.absent} tone="danger" />
                <AttendanceMiniStat icon={AlarmClock} label="Late" value={coverage!.late} tone="warning" />
                <AttendanceMiniStat icon={UserX} label="Leave" value={coverage!.leave} tone="muted" />
              </div>
            )}

            <div className="max-h-72 space-y-4 overflow-y-auto">
              {coverage!.classes.map((c) => (
                <div key={c.classId}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.className}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sections.map((s) => (
                      <span
                        key={s.sectionId}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                          s.marked ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning'
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
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
