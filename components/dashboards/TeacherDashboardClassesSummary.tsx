'use client';

import Link from 'next/link';
import { School, Users, Layers, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyClassesQuery } from '@/store/api/portalApi';
import { useTerminology } from '@/lib/terminology';

/**
 * Full-width stat strip — "what am I actually teaching" at a glance, with a
 * straight line to My Classes rather than making the teacher click through
 * to find out how many sections/students they have.
 *
 * Deliberately full-width, not a sidebar card: this used to live in the
 * dashboard's narrow right-hand column and switched to a horizontal
 * stats-row layout at the `sm` VIEWPORT breakpoint (640px) — but the
 * column it rendered in is only ~1/3 of the page on desktop, well under
 * 640px of actual rendered width. Past that viewport width the row went
 * horizontal regardless, cramming 3 stat blocks and a link into a column
 * they couldn't fit in, so "View my classes" spilled outside the card.
 * Moving this to the top of the page (always full width) fixes the root
 * cause instead of re-tuning breakpoints for a container size that could
 * just as easily change again later; `flex-wrap` below is defense in
 * depth so it degrades gracefully even if that ever changes.
 */
export function TeacherDashboardClassesSummary() {
  const terminology = useTerminology();
  const { data, isLoading } = useMyClassesQuery();
  const classes = data?.data ?? [];

  if (isLoading) return <Card className="p-4"><Skeleton className="h-12 w-full" /></Card>;
  if (classes.length === 0) return null;

  const sectionCount = classes.reduce((s, c) => s + c.sections.length, 0);
  const studentCount = classes.reduce((s, c) => s + c.sections.reduce((ss, sec) => ss + sec.students, 0), 0);

  const stats = [
    { icon: School, label: terminology.classUnitPlural, value: classes.length },
    { icon: Layers, label: terminology.sectionPlural, value: sectionCount },
    { icon: Users, label: 'Students', value: studentCount },
  ];

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Icon size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/teacher/classes" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
        View my {terminology.classUnitPlural.toLowerCase()} <ArrowRight size={14} />
      </Link>
    </Card>
  );
}
