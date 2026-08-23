'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, CalendarCheck, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AttendanceHistory, ResultsList, FeesList } from './displays';
import {
  useMyChildrenQuery,
  useChildAttendanceQuery,
  useChildResultsQuery,
  useChildFeesQuery,
} from '@/store/api/portalApi';
import { formatCurrency, getInitials } from '@/lib/utils';

export function ChildrenView() {
  const { data, isLoading } = useMyChildrenQuery();
  const children = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="My Children" description="Overview of your children's progress." />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-28 w-full" /></Card>)}</div>
      ) : children.length === 0 ? (
        <Card><EmptyState icon={GraduationCap} title="No children linked" description="Contact your institution to link your children to your account." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary-soft-foreground">
                  {getInitials(c.name.split(' ')[0] || '', c.name.split(' ')[1] || '')}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.rollNumber}{c.className ? ` · ${c.className}` : ''}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarCheck size={13} /> Attendance</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{c.attendanceRate}%</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet size={13} /> Fees due</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(c.feesDue)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type Kind = 'attendance' | 'results' | 'fees';
const TITLES: Record<Kind, { title: string; desc: string }> = {
  attendance: { title: "Child's Attendance", desc: 'Attendance record per child.' },
  results: { title: "Child's Results", desc: 'Published exam results per child.' },
  fees: { title: "Child's Fees", desc: 'Fee invoices and dues per child.' },
};

export function ParentScopedView({ kind }: { kind: Kind }) {
  const { data: childrenRes, isLoading: childrenLoading } = useMyChildrenQuery();
  const children = childrenRes?.data ?? [];
  const [sel, setSel] = useState('');

  useEffect(() => {
    if (!sel && children.length) setSel(children[0].id);
  }, [children, sel]);

  const att = useChildAttendanceQuery(sel, { skip: kind !== 'attendance' || !sel });
  const res = useChildResultsQuery(sel, { skip: kind !== 'results' || !sel });
  const fee = useChildFeesQuery(sel, { skip: kind !== 'fees' || !sel });

  const meta = TITLES[kind];

  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} description={meta.desc} />

      {childrenLoading ? (
        <Card className="p-5"><Skeleton className="h-10 w-64" /></Card>
      ) : children.length === 0 ? (
        <Card><EmptyState icon={GraduationCap} title="No children linked" /></Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="max-w-xs">
              <Select value={sel} onValueChange={setSel}>
                <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
                <SelectContent>
                  {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* `isLoading`, not `isFetching` — with refetchOnFocus now on
              (see baseApi.ts), `isFetching` would flip true every time this
              tab regains focus and flash the whole card back to a skeleton
              even though the data underneath hasn't changed. `isLoading`
              still covers switching to a child we haven't fetched yet. */}
          {kind === 'attendance' && <AttendanceHistory data={att.data?.data} isLoading={att.isLoading || !sel} />}
          {kind === 'results' && <ResultsList data={res.data?.data} isLoading={res.isLoading || !sel} />}
          {kind === 'fees' && <FeesList data={fee.data?.data} isLoading={fee.isLoading || !sel} />}
        </>
      )}
    </div>
  );
}
