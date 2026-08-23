'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, CheckCircle2, Wallet, Clock, TrendingUp, Plus, AlertTriangle,
  School, CalendarCheck, DollarSign, ArrowRight, Sparkles, Users, BookOpen,
  Layers, XCircle, AlarmClock, UserX,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AreaTrendChart } from '@/components/charts/charts';
import { useGetStudentStatsQuery } from '@/store/api/studentsApi';
import { useGetAttendanceCoverageTodayQuery } from '@/store/api/attendanceApi';
import { useGetFeesSummaryQuery, useGetFeeStructuresQuery } from '@/store/api/feesApi';
import { useGetReportsQuery } from '@/store/api/reportsApi';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetUsersQuery } from '@/store/api/usersApi';
import { useGetSubjectsQuery } from '@/store/api/subjectsApi';
import { formatCurrency } from '@/lib/utils';

export function AdminDashboard() {
  const router = useRouter();
  const { data: statsRes, isLoading: statsLoading } = useGetStudentStatsQuery();
  const stats = statsRes?.data;
  const totalStudents = statsLoading ? '…' : (stats?.total ?? 0).toLocaleString('en-PK');

  // Per-class/section coverage — replaces the old institution-wide
  // present/absent donut, which told an admin "78% present" but nothing
  // about WHICH sections hadn't even submitted attendance yet. An admin's
  // actual job here is chasing down the teachers who haven't marked
  // attendance, not knowing today's blended percentage.
  const { data: coverageRes, isLoading: coverageLoading } = useGetAttendanceCoverageTodayQuery();
  const coverage = coverageRes?.data;

  const { data: feeRes } = useGetFeesSummaryQuery();
  const fees = feeRes?.data;

  const { data: reportsRes } = useGetReportsQuery();
  const reports = reportsRes?.data;

  const overLimit = (stats?.overLimitBy ?? 0) > 0;

  // Onboarding checklist — each step's "done" state is a real, live check
  // against actual data (not a static list that never updates), so a step
  // that's already been completed shows as done immediately rather than
  // continuing to tell the admin to do something they already did.
  const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery({ all: true });
  const classCount = classesRes?.data?.length ?? 0;
  const { data: teachersRes, isLoading: teachersLoading } = useGetUsersQuery({ role: 'teacher', limit: 1 });
  const teacherCount = (teachersRes as any)?.meta?.total ?? teachersRes?.data?.length ?? 0;
  const { data: feeStructRes, isLoading: feeStructLoading } = useGetFeeStructuresQuery();
  const feeStructureCount = feeStructRes?.data?.length ?? 0;
  const { data: subjectsRes, isLoading: subjectsLoading } = useGetSubjectsQuery();
  const subjectCount = subjectsRes?.data?.length ?? 0;

  // Deliberately ONE-TIME SETUP tasks only — attendance was removed from
  // this list on purpose. It's a recurring daily routine (not a one-off
  // setup step) that's mostly a teacher's job, not the admin's, so it never
  // belonged in an admin-facing "get set up" checklist in the first place —
  // it would also have kept resurfacing the "Finish setting up" reminder
  // every single day regardless of how it was tracked, which isn't what
  // this checklist is for.
  const onboardingLoading = statsLoading || classesLoading || teachersLoading || feeStructLoading || subjectsLoading;
  const studentCount = stats?.total ?? 0;

  const ONBOARDING_STEPS = [
    { label: 'Create your first class & sections', href: '/admin/classes', icon: School, done: classCount > 0 },
    { label: 'Add your teachers', href: '/admin/teachers', icon: Users, done: teacherCount > 0 },
    {
      label: 'Add your subjects',
      href: '/admin/subjects',
      icon: BookOpen,
      done: subjectCount > 0,
      // Assigning a teacher to a subject/section happens on this same
      // Subjects (or Classes) page, not a separate "assign teachers"
      // screen — surfaced as a hint instead of inventing a redundant page,
      // and only once both classes and teachers actually exist to assign.
      hint: classCount > 0 && teacherCount > 0 ? 'Tip: assign a teacher to each subject here.' : undefined,
    },
    { label: 'Add your students', href: '/admin/students', icon: GraduationCap, done: studentCount > 0 },
    { label: 'Set up fee structures', href: '/admin/fees', icon: DollarSign, done: feeStructureCount > 0 },
  ];
  const allStepsDone = ONBOARDING_STEPS.every((s) => s.done);
  const anyStepDone = ONBOARDING_STEPS.some((s) => s.done);
  const totalSteps = ONBOARDING_STEPS.length;
  const doneCount = ONBOARDING_STEPS.filter((s) => s.done).length;
  // The first not-yet-done step, in the checklist's own order — highlighted
  // as "what to do next" so a multi-step checklist doesn't leave the admin
  // guessing which of several open items to start with.
  const nextStepHref = ONBOARDING_STEPS.find((s) => !s.done)?.href;

  // A brand-new institution has nothing set up at all yet — nothing below
  // the stat cards would be real, so guide the admin through the full
  // checklist instead of rendering charts/lists with zero or fabricated
  // data. Once ANY real progress exists, show the normal dashboard (it's
  // now got at least something real to display) but keep a compact
  // reminder of whatever's still left, rather than staying stuck on the
  // full-page checklist forever just because attendance hasn't been marked
  // yet, say.
  const isNewInstitution = !onboardingLoading && !anyStepDone;

  const totalSections = classesRes?.data?.reduce((sum, c) => sum + (c.sections?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {overLimit && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <span>
            You&apos;ve exceeded your plan limit by <strong>{stats?.overLimitBy}</strong> student{stats?.overLimitBy === 1 ? '' : 's'}
            {stats?.planLimit != null ? ` (limit ${stats.planLimit})` : ''}. Please upgrade your plan to avoid account restrictions.
          </span>
        </div>
      )}

      <PageHeader
        title="Dashboard"
        description={
          isNewInstitution
            ? "Welcome to Marksly — let's get your institution set up."
            : "Welcome back — here's an overview of your institution."
        }
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/students')}>
              <Plus size={16} /> Add Student
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push('/admin/reports')}>
              <TrendingUp size={16} /> Reports
            </Button>
          </>
        }
      />

      {/* Stats — always real, even at zero */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          icon={GraduationCap}
          tone="primary"
          delta={stats?.newThisMonth ? `${stats.newThisMonth} new` : undefined}
        />
        <StatCard
          label="Classes & Sections"
          value={classesLoading ? '…' : classCount.toLocaleString('en-PK')}
          icon={Layers}
          tone="success"
          delta={!classesLoading ? `${totalSections} section${totalSections === 1 ? '' : 's'}` : undefined}
        />
        <StatCard
          label="Fees Collected"
          value={fees ? formatCurrency(fees.collectedThisMonth) : '—'}
          icon={Wallet}
          tone="info"
        />
        <StatCard
          label="Outstanding Fees"
          value={fees ? formatCurrency(fees.outstanding) : '—'}
          icon={Clock}
          tone="warning"
        />
      </div>

      {isNewInstitution ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                  <Sparkles size={17} />
                </span>
                <div>
                  <CardTitle>Get your institution ready</CardTitle>
                  <CardDescription>
                    You haven&apos;t added any data yet — follow these steps to start using Marksly.
                  </CardDescription>
                </div>
              </div>
              <span className="hidden shrink-0 text-sm font-medium text-muted-foreground sm:block">
                {doneCount} of {totalSteps} done
              </span>
            </div>
            <OnboardingProgressBar doneCount={doneCount} totalSteps={totalSteps} />
          </CardHeader>
          <CardContent>
            <OnboardingChecklist steps={ONBOARDING_STEPS} nextStepHref={nextStepHref} />
          </CardContent>
        </Card>
      ) : (
        <>
          {!allStepsDone && (
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <CardTitle>Finish setting up</CardTitle>
                      <CardDescription>A few things are still left from your setup checklist.</CardDescription>
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-sm font-medium text-muted-foreground sm:block">
                    {doneCount} of {totalSteps} done
                  </span>
                </div>
                <OnboardingProgressBar doneCount={doneCount} totalSteps={totalSteps} />
              </CardHeader>
              <CardContent>
                <OnboardingChecklist steps={ONBOARDING_STEPS.filter((s) => !s.done)} nextStepHref={nextStepHref} />
              </CardContent>
            </Card>
          )}

          {/* Today's attendance — per-class/section coverage, not just a
              single blended percentage. See TodaysAttendanceCard's own
              comment for why this replaced the old donut chart. */}
          <TodaysAttendanceCard coverage={coverage} loading={coverageLoading} onMarkAttendance={() => router.push('/admin/attendance')} />

          {/* Fee Collection — real data from the reports API */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection</CardTitle>
              <CardDescription>Monthly collected amount, last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {reports?.feeCollection?.some((m) => m.amount > 0) ? (
                <AreaTrendChart data={reports.feeCollection} xKey="label" yKey="amount" />
              ) : (
                <EmptyState
                  icon={Wallet}
                  title="No payments recorded yet"
                  description="Once fee payments come in, this chart will fill in automatically."
                />
              )}
            </CardContent>
          </Card>

          {/* Quick actions — always accurate, never fabricated */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common things you might do next</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Link
                  href="/admin/attendance"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <CalendarCheck size={18} className="shrink-0" /> Mark attendance
                </Link>
                <Link
                  href="/admin/fees"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <DollarSign size={18} className="shrink-0" /> Record a payment
                </Link>
                <Link
                  href="/admin/notices"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <TrendingUp size={18} className="shrink-0" /> Post a notice
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

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
function TodaysAttendanceCard({
  coverage,
  loading,
  onMarkAttendance,
}: {
  coverage: import('@/store/api/attendanceApi').AttendanceCoverage | undefined;
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

interface OnboardingStep {
  label: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
  hint?: string;
}

/** Slim progress bar + fraction text, shared by the full checklist card and
 *  the compact "Finish setting up" card so both read the same way. Purely
 *  visual — no logic of its own, just renders whatever counts it's given. */
function OnboardingProgressBar({ doneCount, totalSteps }: { doneCount: number; totalSteps: number }) {
  const pct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${doneCount} of ${totalSteps} setup steps complete`}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Each step's `done` state is checked live against real data (classes,
 *  teachers, students, fee structures) — see AdminDashboard's own hooks for
 *  exactly what each one checks. A completed step shows a checkmark and
 *  stays clickable (so an admin can still go add a second class, more
 *  teachers, etc.) rather than disappearing or looking static. `nextStepHref`
 *  highlights the single next not-done step with a "Next" badge and a
 *  slightly stronger border, so a checklist with several open items still
 *  gives a clear "start here" instead of leaving every open row looking
 *  equally important. */
function OnboardingChecklist({ steps, nextStepHref }: { steps: OnboardingStep[]; nextStepHref?: string }) {
  return (
    <ul className="space-y-2">
      {steps.map((step, i) => {
        const isNext = !step.done && step.href === nextStepHref;
        return (
          <li key={step.href}>
            <Link
              href={step.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
                step.done
                  ? 'border-transparent bg-transparent hover:bg-muted/60'
                  : isNext
                    ? 'border-primary/40 bg-primary-soft/40 hover:border-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  step.done
                    ? 'bg-success-soft text-success'
                    : isNext
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {step.done ? <CheckCircle2 size={16} /> : i + 1}
              </span>
              <step.icon size={16} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-medium', step.done && 'text-muted-foreground line-through')}>
                  {step.label}
                </span>
                {step.hint && !step.done && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{step.hint}</span>
                )}
              </span>
              {step.done ? (
                <span className="shrink-0 text-xs font-medium text-success">Done</span>
              ) : isNext ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                  Next <ArrowRight size={12} />
                </span>
              ) : (
                <ArrowRight size={16} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
