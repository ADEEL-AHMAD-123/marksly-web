'use client';

import Link from 'next/link';
import { GraduationCap, CalendarCheck, Wallet, ChevronRight, Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyChildrenQuery } from '@/store/api/portalApi';
import { useGetNoticesQuery } from '@/store/api/noticesApi';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

// Previously this page showed two entirely invented children ("Ali Khan",
// "Sara Khan") with hardcoded attendance/fee numbers and a "View details"
// button that didn't even navigate anywhere — every parent saw the exact
// same fake data regardless of who their real children are. Rewritten to
// use the same real `useMyChildrenQuery()` data ChildrenView (the "My
// Children" page) already uses correctly, so the dashboard's summary
// actually matches reality.
export function ParentDashboardView() {
  const { data, isLoading } = useMyChildrenQuery();
  const children = data?.data ?? [];
  const totalFeesDue = children.reduce((sum, c) => sum + c.feesDue, 0);

  // Notices — every other role's dashboard (teacher, student, accountant)
  // already surfaces these; the parent portal previously had no notices
  // section at all despite getNotices already being audience-scoped
  // server-side to include the 'parent' role.
  const { data: noticesRes, isLoading: noticesLoading } = useGetNoticesQuery({ limit: 5 });
  const notices = noticesRes?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent Portal"
        description="Stay updated on your children's progress."
        actions={
          totalFeesDue > 0 ? (
            <Link href="/parent/fees" className={buttonVariants({ size: 'sm' })}>
              <Wallet size={16} /> Pay Fees
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-32 w-full" /></Card>)}
        </div>
      ) : children.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No children linked"
            description="Contact your institution to link your children to your account."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary-soft-foreground">
                    {getInitials(c.name.split(' ')[0] || '', c.name.split(' ').slice(1).join(' ') || '')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.rollNumber}{c.className ? ` · ${c.className}` : ''}</p>
                  </div>
                  <Badge variant={c.feesDue > 0 ? 'warning' : 'success'}>
                    {c.feesDue > 0 ? 'Fees Pending' : 'Fees Paid'}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarCheck size={13} /> Attendance
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">{c.attendanceRate}%</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wallet size={13} /> Fees due
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(c.feesDue)}</p>
                  </div>
                </div>
                <Link href="/parent/children">
                  <Button variant="ghost" size="sm" className="mt-3 w-full justify-between">
                    View details <ChevronRight size={16} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell size={18} /> Notices</CardTitle>
            <CardDescription>From your institution</CardDescription>
          </CardHeader>
          <CardContent>
            {noticesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : notices.length === 0 ? (
              <EmptyState icon={Bell} title="No notices" description="You're all caught up." />
            ) : (
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <Bell size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(n.publishedAt)}</p>
                    </div>
                    {(n.priority === 'high' || n.priority === 'urgent') && <Badge variant="danger">Important</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
