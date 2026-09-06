'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { useMyClassesQuery } from '@/store/api/portalApi';
import { TeacherDashboardEmptyState } from '@/components/dashboards/TeacherDashboardEmptyState';
import { TeacherDashboardIdCardNudge } from '@/components/dashboards/TeacherDashboardIdCardNudge';
import { TeacherDashboardToday } from '@/components/dashboards/TeacherDashboardToday';
import { TeacherDashboardClassesSummary } from '@/components/dashboards/TeacherDashboardClassesSummary';
import { TeacherDashboardExamsQueue } from '@/components/dashboards/TeacherDashboardExamsQueue';
import { TeacherDashboardNotices } from '@/components/dashboards/TeacherDashboardNotices';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Teacher landing page — previously just a header + TeachNowCard, which was
 * a near-blank page the moment a teacher had no timetable slot happening
 * right that minute. Now composed of small, independently-loading widgets
 * (same pattern as AdminDashboard.tsx's split into
 * AdminDashboardStats/Attendance/Actions) so one slow or empty widget never
 * blanks the whole page — each one hides itself via `return null` when it
 * has nothing real to show, rather than rendering a fabricated empty card.
 *
 * The one true "nothing to show" case — zero classes/sections assigned at
 * all — is handled separately via TeacherDashboardEmptyState, which explains
 * that this is a pending admin setup step, not a broken page.
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

      <TeacherDashboardIdCardNudge />

      {classesLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : !hasAnyClasses ? (
        <TeacherDashboardEmptyState />
      ) : (
        <>
          <TeacherDashboardToday />
          <TeacherDashboardClassesSummary />
          <TeacherDashboardExamsQueue />
          <TeacherDashboardNotices />
        </>
      )}
    </div>
  );
}
