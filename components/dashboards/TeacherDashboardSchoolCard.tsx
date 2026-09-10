'use client';

import { Building2, Users, GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMyInstitutionOverviewQuery } from '@/store/api/institutionApi';

/**
 * Gives the page a sense of belonging even before a teacher has any
 * classes/students of their own — institution logo/name plus institution-
 * wide teacher/student counts. Uses the trimmed /institutions/me/overview
 * endpoint (open to teacher/staff/accountant), not the admin-only /me
 * profile endpoint. Never renders null — an institution always exists for
 * an authenticated member, so this is always real content, not a
 * conditional widget.
 */
export function TeacherDashboardSchoolCard() {
  const { data, isLoading } = useGetMyInstitutionOverviewQuery();
  const overview = data?.data;

  if (isLoading) return <Card className="p-5"><Skeleton className="h-24 w-full" /></Card>;
  if (!overview) return null;

  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-semibold text-foreground">Your school</p>
      <div className="mb-3 flex items-center gap-2.5">
        {overview.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={overview.logoUrl} alt={`${overview.name} logo`} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Building2 size={16} />
          </span>
        )}
        <p className="truncate text-sm font-medium text-foreground">{overview.name}</p>
      </div>
      <div className="flex gap-5">
        <div className="flex items-center gap-2">
          <GraduationCap size={15} className="text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold leading-none text-foreground">{overview.teacherCount}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Teachers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users size={15} className="text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold leading-none text-foreground">{overview.studentCount}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Students</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
