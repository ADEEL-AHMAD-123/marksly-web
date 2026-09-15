'use client';

import {
  GraduationCap, School, DollarSign, Users, BookOpen, ImageUp, CalendarRange, Building2, Landmark,
} from 'lucide-react';
import { useGetFeeStructuresQuery, useGetPayoutAccountsQuery } from '@/store/api/feesApi';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetUsersQuery } from '@/store/api/usersApi';
import { useGetSubjectsQuery } from '@/store/api/subjectsApi';
import { useGetMyInstitutionQuery } from '@/store/api/institutionApi';
import { useGetActiveTermsQuery } from '@/store/api/termsApi';
import { useGetStudentStatsQuery } from '@/store/api/studentsApi';
import { useTerminology } from '@/lib/terminology';
import { looksAbbreviated } from '@/lib/institution-name';
import type { OnboardingStep } from '@/components/dashboards/AdminDashboardOnboarding';

/**
 * The institution setup checklist's steps, live-computed against real data
 * — shared by the admin dashboard's onboarding card AND the persistent
 * "Setup checklist" tab in Settings (see SettingsSetupTab.tsx), so an admin
 * can always find it again even once they're past the dashboard's "new
 * institution" full-page view (which only shows while NOTHING is done
 * yet). Extracted here rather than duplicated so a step added/changed once
 * shows up correctly in both places.
 */
export function useOnboardingSteps() {
  const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery();
  const classCount = classesRes?.data?.length ?? 0;
  const { data: teachersRes, isLoading: teachersLoading } = useGetUsersQuery({ role: 'teacher', limit: 1 });
  const teacherCount = (teachersRes as any)?.meta?.total ?? teachersRes?.data?.length ?? 0;
  const { data: feeStructRes, isLoading: feeStructLoading } = useGetFeeStructuresQuery();
  const feeStructureCount = feeStructRes?.data?.length ?? 0;
  const { data: payoutRes, isLoading: payoutLoading } = useGetPayoutAccountsQuery();
  // listPayoutAccounts already excludes inactive/removed accounts server-side.
  const payoutAccountCount = payoutRes?.data?.length ?? 0;
  const { data: subjectsRes, isLoading: subjectsLoading } = useGetSubjectsQuery();
  const subjectCount = subjectsRes?.data?.length ?? 0;
  const terminology = useTerminology();
  const { data: institutionRes, isLoading: institutionLoading } = useGetMyInstitutionQuery();
  const hasLogo = !!institutionRes?.data?.logoUrl;
  const institutionNameOk =
    !looksAbbreviated(institutionRes?.data?.name) || !!institutionRes?.data?.nameConfirmed;
  const { data: activeTermsRes, isLoading: termsLoading } = useGetActiveTermsQuery();
  const activeTermCount = activeTermsRes?.data?.length ?? 0;
  const { data: statsRes, isLoading: statsLoading } = useGetStudentStatsQuery();
  const studentCount = statsRes?.data?.total ?? 0;

  const isLoading =
    classesLoading || teachersLoading || feeStructLoading || payoutLoading || subjectsLoading ||
    institutionLoading || termsLoading || statsLoading;

  const steps: OnboardingStep[] = [
    {
      label: "Add your institution's logo",
      href: '/admin/settings?tab=institution',
      icon: ImageUp,
      done: hasLogo,
      hint: 'Shows on ID cards, receipts and the sidebar — makes it look like your system, not a generic one.',
    },
    {
      label: 'Confirm your institution name',
      href: '/admin/settings?tab=institution',
      icon: Building2,
      done: institutionNameOk,
      hint: 'This exact text prints on ID cards, fee receipts, invoices and timetables — make sure it\'s the full name, not a short form.',
    },
    {
      label: 'Set up your academic year',
      href: '/admin/academic-year',
      icon: CalendarRange,
      done: activeTermCount > 0,
    },
    {
      label: `Create your first ${terminology.classUnit.toLowerCase()} & ${terminology.sectionPlural.toLowerCase()}`,
      href: '/admin/classes',
      icon: School,
      done: classCount > 0,
      hint: activeTermCount === 0 ? 'Needs an academic year set up first.' : undefined,
    },
    {
      label: 'Add your teachers',
      href: '/admin/staff?tab=teacher',
      icon: Users,
      done: teacherCount > 0,
      hint: 'Already have a staff list? Import it as a CSV in one go.',
    },
    {
      label: 'Add your subjects',
      href: '/admin/subjects',
      icon: BookOpen,
      done: subjectCount > 0,
      hint: classCount > 0 && teacherCount > 0 ? 'Tip: assign a teacher to each subject here.' : undefined,
    },
    {
      label: 'Add your students',
      href: '/admin/students',
      icon: GraduationCap,
      done: studentCount > 0,
      hint: 'Migrating from a register or spreadsheet? Bulk-import your student list as a CSV.',
    },
    {
      label: 'Set up fee structures',
      href: '/admin/fees',
      icon: DollarSign,
      done: feeStructureCount > 0,
    },
    // Without a payout account, every fee slip a parent downloads has no
    // "pay to" bank details at all — Marksly never collects the money
    // itself, so this is a hard requirement, not a nice-to-have, and
    // belongs right after fee structures since that's the point an admin
    // is about to start generating challans.
    {
      label: 'Add a bank account for fee payments',
      href: '/admin/fees?tab=payout',
      icon: Landmark,
      done: payoutAccountCount > 0,
      hint: feeStructureCount > 0 ? "Parents pay directly into this — it's what prints on every fee slip." : 'Needs at least one fee structure set up first.',
    },
  ];

  const totalSteps = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const allStepsDone = doneCount === totalSteps;
  const anyStepDone = doneCount > 0;
  const nextStepHref = steps.find((s) => !s.done)?.href;

  return { steps, isLoading, totalSteps, doneCount, allStepsDone, anyStepDone, nextStepHref };
}
