import { GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTerminology } from '@/lib/terminology';
import type { CumulativeGpaResult } from '@/store/api/portalApi';

/**
 * Cumulative GPA summary shown above a student's/child's results list.
 * Mirrors the admin-facing CGPA section in StudentDetailDrawer.tsx exactly
 * (same "hide entirely if cgpa === null" rule) — a student with no
 * gpa-scheme courses must not see a confusing "GPA: null" or "GPA: 0.00".
 */
export function GpaSummary({ data, isLoading }: { data?: CumulativeGpaResult; isLoading: boolean }) {
  const terminology = useTerminology();
  const hasGpaData = !!data && data.cgpa != null && data.termBreakdown.length > 0;

  if (isLoading && !data) return <Card className="p-5"><Skeleton className="h-24 w-full" /></Card>;
  if (!hasGpaData) return null;

  return (
    <Card className="p-5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <GraduationCap size={12} /> Cumulative GPA
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Overall</span>
        <span className="text-2xl font-bold text-foreground">{data!.cgpa!.toFixed(2)}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{data!.totalCreditHours} credit hours total</p>
      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        {data!.termBreakdown.map((t) => (
          <div key={t.termId} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.termName || terminology.term}</span>
            <span className="font-medium text-foreground">
              {t.gpa != null ? t.gpa.toFixed(2) : '—'}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">({t.creditHours} cr.)</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
