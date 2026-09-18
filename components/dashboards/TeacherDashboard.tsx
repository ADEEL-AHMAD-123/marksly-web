'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { useMyClassesQuery } from '@/store/api/portalApi';
import { TeacherDashboardEmptyState } from '@/components/dashboards/TeacherDashboardEmptyState';
import { DashboardIdCardNudge } from '@/components/dashboards/DashboardIdCardNudge';
import { DashboardEmailNudge } from '@/components/dashboards/DashboardEmailNudge';
import { DashboardNoticeBanner } from '@/components/dashboards/DashboardNoticeBanner';
import { TeacherDashboardQuickActions } from '@/components/dashboards/TeacherDashboardQuickActions';
import { TeacherDashboardToday } from '@/components/dashboards/TeacherDashboardToday';
import { TeacherDashboardWeekStrip } from '@/components/dashboards/TeacherDashboardWeekStrip';
import { TeacherDashboardClassesSummary } from '@/components/dashboards/TeacherDashboardClassesSummary';
import { TeacherDashboardExamsQueue } from '@/components/dashboards/TeacherDashboardExamsQueue';
import { DashboardNotices } from '@/components/dashboards/DashboardNotices';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Teacher landing page. Information hierarchy, in order of what a teacher
 * actually opens this page to find out:
 *  1. Attention layer — urgent/high notices banner, above everything else,
 *     because it's externally pushed and time-sensitive.
 *  2. Orientation layer — a single full-width "what I'm teaching" stat
 *     strip (classes/sections/students + a link to the full list). Full
 *     width deliberately, not tucked into a sidebar: a 3-stat row plus a
 *     link needs real width to lay out horizontally, and a narrow sidebar
 *     column is exactly what caused it to overflow its card before (see
 *     TeacherDashboardClassesSummary's comment).
 *  3. Task layer (left/wide column on desktop, top of stack on mobile) —
 *     today's schedule + quick actions: what to DO right now.
 *  4. Context layer (right/narrow column, lower on mobile) — notices:
 *     reference material, glanced at rather than acted on. Kept
 *     deliberately light now that the stats strip moved out — this column
 *     never needs to lay out more than one thing per row, so it can't run
 *     into the same width problem again. Used to also carry
 *     DashboardSchoolCard (institution logo/name + institution-wide
 *     teacher/student counts) here, but that's static info a teacher
 *     already knows just by working there and isn't why anyone opens this
 *     page — dropped from the populated dashboard. It still appears in
 *     TeacherDashboardEmptyState, where it earns its place keeping a
 *     brand-new teacher's zero-classes dashboard from looking structurally
 *     empty.
 * The two-column split isn't just visual — it's action items vs. reference
 * data, so the wider column always carries more visual weight.
 *
 * Each widget independently hides itself (`return null`) when it has
 * nothing real to show; see TeacherDashboardEmptyState for the
 * zero-classes case specifically.
 */
export function TeacherDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: classesRes, isLoading: classesLoading } = useMyClassesQuery();
  const hasAnyClasses = (classesRes?.data ?? []).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${user?.firstName ? `, ${user.firstName}` : ''}`}
        description="Here's your day at a glance."
      />

      <DashboardNoticeBanner noticesHref="/teacher/notices" />
      <DashboardIdCardNudge />
      <DashboardEmailNudge />

      {classesLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : !hasAnyClasses ? (
        <TeacherDashboardEmptyState />
      ) : (
        <>
          <TeacherDashboardClassesSummary />
          <TeacherDashboardQuickActions />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <TeacherDashboardToday />
              <TeacherDashboardWeekStrip />
              <TeacherDashboardExamsQueue />
            </div>
            <div className="space-y-6">
              <DashboardNotices noticesHref="/teacher/notices" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
