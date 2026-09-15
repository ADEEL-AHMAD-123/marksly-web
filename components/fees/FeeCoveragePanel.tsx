'use client';

import Link from 'next/link';
import { CheckCircle2, XCircle, School } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetFeeStructuresQuery } from '@/store/api/feesApi';
import { useTerminology } from '@/lib/terminology';

/**
 * Answers "which classes actually have Tuition configured" at a glance, so a
 * gap is always visible to the admin rather than silently missing invoices
 * later. This is deliberately category-precise: a class that only has (say)
 * a Library or Sports structure is NOT "covered" — Tuition is the
 * coverage-critical category (per the fees redesign plan), since a missing
 * Tuition structure means the billing run silently produces zero income for
 * that class while every other category looks configured. A class counts
 * as covered for Tuition if it has its own active Tuition structure, or an
 * active "all classes" Tuition structure (classId: null) applies to everyone.
 */
export function FeeCoveragePanel() {
  const terminology = useTerminology();
  const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const { data: structuresRes, isLoading: structuresLoading } = useGetFeeStructuresQuery();
  const structures = structuresRes?.data ?? [];

  if (classesLoading || structuresLoading) return null;

  // No classes at all yet -- fee setup has nothing to attach to, so guide
  // the admin there first instead of showing a confusing empty fees screen.
  if (classes.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={School}
          title={`Set up your ${terminology.classUnitPlural.toLowerCase()} first`}
          description={`Fee structures are configured per ${terminology.classUnit.toLowerCase()} (or for all of them at once) — add at least one ${terminology.classUnit.toLowerCase()}, then come back here to configure fees.`}
          action={
            <Link href="/admin/classes" className={buttonVariants({ size: 'sm' })}>
              Go to {terminology.classUnitPlural}
            </Link>
          }
        />
      </Card>
    );
  }

  const isTuition = (s: (typeof structures)[number]) => (s.category ?? 'tuition') === 'tuition';
  const hasAllClassesTuition = structures.some((s) => s.isActive && !s.classId && isTuition(s));
  const uncovered = classes.filter(
    (c) => !hasAllClassesTuition && !structures.some((s) => s.isActive && s.classId === c.id && isTuition(s))
  );

  if (uncovered.length === 0) return null;

  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium text-foreground">Tuition fee coverage</p>
      <div className="flex flex-wrap gap-1.5">
        {classes.map((c) => {
          const covered = hasAllClassesTuition || structures.some((s) => s.isActive && s.classId === c.id && isTuition(s));
          return (
            <Badge key={c.id} variant={covered ? 'success' : 'neutral'}>
              {covered ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {c.name}
            </Badge>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {uncovered.length} {terminology.classUnitPlural.toLowerCase()} without an active Tuition structure yet
        (other fee categories like transport or library don't count) — billing runs will simply skip them until one is added.
      </p>
    </Card>
  );
}
