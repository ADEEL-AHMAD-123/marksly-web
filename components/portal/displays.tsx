'use client';

import { CalendarCheck, FileText, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AttendanceData, ResultItem, FeeItem, AttendanceStatus } from '@/store/api/portalApi';

const attBadge: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success', absent: 'danger', late: 'warning', leave: 'neutral',
};

export function AttendanceHistory({ data, isLoading }: { data?: AttendanceData; isLoading: boolean }) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">Attendance rate</p>
          <p className="text-3xl font-bold text-foreground">{data.rate}%</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-soft text-success"><CalendarCheck size={24} /></span>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent periods</CardTitle></CardHeader>
        <CardContent>
          {data.records.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No attendance recorded yet" />
          ) : (
            <ul className="divide-y divide-border">
              {data.records.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{formatDate(r.date)}</p>
                    {(r.subject || r.startTime) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {r.subject ?? 'Class'}{r.startTime ? ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ''}` : ''}
                      </p>
                    )}
                  </div>
                  <Badge variant={attBadge[r.status]} className="shrink-0 capitalize">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ResultsList({ data, isLoading }: { data?: ResultItem[]; isLoading: boolean }) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  if (data.length === 0) return <Card><EmptyState icon={FileText} title="No results published yet" description="Published exam results will appear here." /></Card>;

  return (
    <div className="space-y-4">
      {data.map((r, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{r.examTitle}</CardTitle>
              <p className="text-xs capitalize text-muted-foreground">{r.type}</p>
            </div>
            <div className="text-right">
              <Badge variant={r.isPassed ? 'success' : 'danger'}>{r.grade} · {r.percentage}%</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{r.totalObtained}/{r.totalMarks}</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {r.marks.map((m, j) => (
                <li key={j} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium text-foreground">{m.obtained}/{m.total}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const feeBadge = {
  paid: { variant: 'success' as const, label: 'Paid' },
  partial: { variant: 'primary' as const, label: 'Partial' },
  pending: { variant: 'warning' as const, label: 'Pending' },
  overdue: { variant: 'danger' as const, label: 'Overdue' },
};

export function FeesList({ data, isLoading }: { data?: FeeItem[]; isLoading: boolean }) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  const totalDue = data.reduce((s, f) => s + Math.max(0, f.balance), 0);
  if (data.length === 0) return <Card><EmptyState icon={Wallet} title="No fee invoices yet" /></Card>;

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">Total outstanding</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalDue)}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-soft text-warning"><Wallet size={24} /></span>
      </Card>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {data.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{f.structureName ?? 'Fee'}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(f.dueDate)} · {formatCurrency(f.netAmount)}</p>
                </div>
                <div className="text-right">
                  <Badge variant={feeBadge[f.status].variant}>{feeBadge[f.status].label}</Badge>
                  {f.balance > 0 && <p className="mt-1 text-xs text-muted-foreground">Bal {formatCurrency(f.balance)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
