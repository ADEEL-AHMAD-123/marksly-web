'use client';

import Link from 'next/link';
import { GraduationCap, BookOpen, ArrowRight, Hourglass } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyCgpaQuery, useMySubjectsQuery } from '@/store/api/portalApi';

/**
 * A small stat strip pulling together two things that otherwise live on
 * separate pages a student would never think to check from the dashboard:
 * their cumulative GPA (only shown when the institution actually uses a
 * GPA grading scheme — null means N/A, not zero) and how many elective
 * subject requests are still pending approval (a state that's easy to
 * forget about once submitted).
 */
export function StudentDashboardAcademicsSnapshot() {
  const { data: cgpaRes, isLoading: cgpaLoading } = useMyCgpaQuery();
  const cgpa = cgpaRes?.data;
  const { data: subjectsRes, isLoading: subjectsLoading } = useMySubjectsQuery();
  const subjects = subjectsRes?.data;

  const isLoading = cgpaLoading || subjectsLoading;
  if (isLoading) return <Card className="p-5"><Skeleton className="h-16 w-full" /></Card>;

  const pendingElectives = (subjects?.electives ?? []).filter((e) => e.status === 'pending').length;
  const coreCount = subjects?.core?.length ?? 0;

  // Nothing worth a whole card if there's no GPA scheme in use AND no
  // subjects data at all yet.
  if (cgpa?.cgpa == null && coreCount === 0 && pendingElectives === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-6">
        {cgpa?.cgpa != null && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <GraduationCap size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold leading-none text-foreground">{cgpa.cgpa.toFixed(2)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">CGPA</p>
            </div>
          </div>
        )}
        {coreCount > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <BookOpen size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold leading-none text-foreground">{coreCount}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Subjects</p>
            </div>
          </div>
        )}
        {pendingElectives > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Hourglass size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold leading-none text-foreground">{pendingElectives}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Elective{pendingElectives === 1 ? '' : 's'} pending</p>
            </div>
          </div>
        )}
      </div>
      <Link href="/student/subjects" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
        View subjects <ArrowRight size={14} />
      </Link>
    </Card>
  );
}
