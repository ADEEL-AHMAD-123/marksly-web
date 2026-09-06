'use client';

import Link from 'next/link';
import { Wallet, ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyFeesQuery } from '@/store/api/portalApi';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_VARIANT = {
  overdue: 'danger' as const,
  pending: 'warning' as const,
  partial: 'primary' as const,
  paid: 'success' as const,
};

/**
 * The old stat row only ever showed a single lump "Fees Due" total — useful
 * as a headline number, but it never told the student WHICH invoice needs
 * paying or by when. This surfaces the single nearest-due unpaid invoice
 * (soonest due date first, overdue ones naturally sort earliest) with a
 * direct pay link, and hides itself entirely once nothing is owed.
 */
export function StudentDashboardFeesNudge() {
  const { data, isLoading } = useMyFeesQuery();
  const fees = data?.data ?? [];
  const unpaid = fees.filter((f) => f.status !== 'paid').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (isLoading) return <Card className="p-5"><Skeleton className="h-20 w-full" /></Card>;
  if (unpaid.length === 0) return null;

  const next = unpaid[0];
  const isOverdue = next.status === 'overdue';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wallet size={18} /> Fees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${isOverdue ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'}`}>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {isOverdue && <AlertTriangle size={14} className="shrink-0 text-danger" />}
              {next.structureName ?? 'Fee'} — {formatCurrency(next.balance)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isOverdue ? 'Was due' : 'Due'} {formatDate(next.dueDate)}
              {unpaid.length > 1 ? ` · ${unpaid.length - 1} more pending` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={STATUS_VARIANT[next.status]} className="hidden sm:inline-flex capitalize">{next.status}</Badge>
            <Link href="/student/fees" className={buttonVariants({ size: 'sm', variant: isOverdue ? 'primary' : 'outline' })}>
              Pay <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
