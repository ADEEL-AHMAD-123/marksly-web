'use client';

import { useRouter } from 'next/navigation';
import {
  GraduationCap, TrendingUp, Plus, AlertTriangle,
  School, DollarSign, Users, BookOpen, ImageUp, CalendarRange,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useGetStudentStatsQuery } from '@/store/api/studentsApi';
import { useGetAttendanceCoverageTodayQuery } from '@/store/api/attendanceApi';
import { useGetFeesSummaryQuery, useGetFeeStructuresQuery } from '@/store/api/feesApi';
import { useGetReportsQuery } from '@/store/api/reportsApi';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetUsersQuery } from '@/store/api/usersApi';
import { useGetSubjectsQuery } from '@/store/api/subjectsApi';
import { useGetMyInstitutionQuery } from '@/store/api/institutionApi';
import { useGetActiveTermsQuery } from '@/store/api/termsApi';
import { AdminDashboardStats } from '@/components/dashboards/AdminDashboardStats';
import { OnboardingCard, type OnboardingStep } from '@/components/dashboards/AdminDashboardOnboarding';
import { TodaysAttendanceCard } from '@/components/dashboards/AdminDashboardAttendance';
import { FeeCollectionCard, QuickActionsCard } from '@/components/dashboards/AdminDashboardActions';

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
  // Deliberately NOT { all: true } — that variant includes classes tied to
  // any term ever, even closed/upcoming ones, which is exactly the bug this
  // comment is here to prevent regressing: a class left over in an old,
  // no-longer-active term made this step silently show as "done" while the
  // actual Classes page (which correctly only shows classes in currently
  // active terms — see class.service.ts's list()) still showed zero. The
  // checklist must match what the admin actually sees when they click
  // through, not a superset of it.
  const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery();
  const classCount = classesRes?.data?.length ?? 0;
  const { data: teachersRes, isLoading: teachersLoading } = useGetUsersQuery({ role: 'teacher', limit: 1 });
  const teacherCount = (teachersRes as any)?.meta?.total ?? teachersRes?.data?.length ?? 0;
  const { data: feeStructRes, isLoading: feeStructLoading } = useGetFeeStructuresQuery();
  const feeStructureCount = feeStructRes?.data?.length ?? 0;
  const { data: subjectsRes, isLoading: subjectsLoading } = useGetSubjectsQuery();
  const subjectCount = subjectsRes?.data?.length ?? 0;
  const { data: institutionRes, isLoading: institutionLoading } = useGetMyInstitutionQuery();
  const hasLogo = !!institutionRes?.data?.logoUrl;
  // A class can't actually be created without an active term to attach it
  // to (class.service.ts's create() 400s with INVALID_TERM otherwise) — so
  // this has to come before the classes step in the checklist, not after
  // it, or an admin would hit "Create your first class" and only discover
  // the real blocker once they're already in that form.
  const { data: activeTermsRes, isLoading: termsLoading } = useGetActiveTermsQuery();
  const activeTermCount = activeTermsRes?.data?.length ?? 0;

  // Deliberately ONE-TIME SETUP tasks only — attendance was removed from
  // this list on purpose. It's a recurring daily routine (not a one-off
  // setup step) that's mostly a teacher's job, not the admin's, so it never
  // belonged in an admin-facing "get set up" checklist in the first place —
  // it would also have kept resurfacing the "Finish setting up" reminder
  // every single day regardless of how it was tracked, which isn't what
  // this checklist is for.
  const onboardingLoading = statsLoading || classesLoading || teachersLoading || feeStructLoading || subjectsLoading || institutionLoading || termsLoading;
  const studentCount = stats?.total ?? 0;

  // Hints below deliberately surface the CSV bulk-import path on the two
  // steps where it matters most (teachers, students) — a real school
  // migrating from a spreadsheet or paper register has 50-1000+ existing
  // records, and "add one at a time" reads as a dealbreaker of a first
  // impression if that's all a new admin sees. Both student.service.ts's
  // and user.service.ts's bulkImport() already support this; the gap was
  // that nothing on this checklist told a first-time admin it exists.
  const ONBOARDING_STEPS: OnboardingStep[] = [
    // First on the list, deliberately — before any real class/student data
    // exists, this is the one step that makes the rest of the product feel
    // like the institution's own system rather than a shared, generic
    // template. It's also what shows up on ID cards, receipts, and the
    // sidebar the moment it's set, so doing it first pays off immediately.
    {
      label: "Add your institution's logo",
      href: '/admin/settings?tab=institution',
      icon: ImageUp,
      done: hasLogo,
      hint: 'Shows on ID cards, receipts and the sidebar — makes it look like your system, not a generic one.',
    },
    {
      label: 'Set up your academic year',
      href: '/admin/academic-year',
      icon: CalendarRange,
      done: activeTermCount > 0,
    },
    {
      label: 'Create your first class & sections',
      href: '/admin/classes',
      icon: School,
      done: classCount > 0,
      hint: activeTermCount === 0 ? 'Needs an academic year set up first.' : undefined,
    },
    {
      label: 'Add your teachers',
      href: '/admin/teachers',
      icon: Users,
      done: teacherCount > 0,
      hint: 'Already have a staff list? Import it as a CSV in one go.',
    },
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
    {
      label: 'Add your students',
      href: '/admin/students',
      icon: GraduationCap,
      done: studentCount > 0,
      hint: 'Migrating from a register or spreadsheet? Bulk-import your student list as a CSV.',
    },
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

      {/* Stats — always real, even at zero. Leads with "today" signals
          (attendance coverage, fees collected today) rather than static
          setup/balance numbers — see AdminDashboardStats's own comment. */}
      <AdminDashboardStats
        totalStudents={totalStudents}
        newThisMonth={stats?.newThisMonth}
        coverage={coverage}
        coverageLoading={coverageLoading}
        fees={fees}
        onMarkAttendance={() => router.push('/admin/attendance')}
      />

      {isNewInstitution ? (
        <OnboardingCard
          variant="new"
          steps={ONBOARDING_STEPS}
          nextStepHref={nextStepHref}
          doneCount={doneCount}
          totalSteps={totalSteps}
        />
      ) : (
        <>
          {!allStepsDone && (
            <OnboardingCard
              variant="compact"
              steps={ONBOARDING_STEPS.filter((s) => !s.done)}
              nextStepHref={nextStepHref}
              doneCount={doneCount}
              totalSteps={totalSteps}
            />
          )}

          {/* Today's attendance — per-class/section coverage, not just a
              single blended percentage. See TodaysAttendanceCard's own
              comment for why this replaced the old donut chart. */}
          <TodaysAttendanceCard coverage={coverage} loading={coverageLoading} onMarkAttendance={() => router.push('/admin/attendance')} />

          {/* Fee Collection — real data from the reports API */}
          <FeeCollectionCard reports={reports} />

          {/* Quick actions — always accurate, never fabricated */}
          <QuickActionsCard />
        </>
      )}
    </div>
  );
}
