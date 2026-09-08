'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap, Wallet, Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { useMyChildrenQuery } from '@/store/api/portalApi';
import { useGetNoticesQuery } from '@/store/api/noticesApi';
import { formatDate } from '@/lib/utils';
import { ParentDashboardChildCard } from '@/components/portal/ParentDashboardChildCard';

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

      {!isLoading && children.length > 0 && (
        <InfoNote title="What can I do here?">
          <p>
            This page is a quick summary — for the full picture on any one child, use{' '}
            <strong>My Children</strong> below or the links here.
          </p>
          <p>
            Check day-to-day <strong>attendance</strong>, term <strong>results</strong> once published, and any{' '}
            <strong>fees</strong> due. Fees can be paid directly from the Fees page.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <Link href="/parent/children" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              My Children <ArrowRight size={12} />
            </Link>
            <Link href="/parent/attendance" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Attendance <ArrowRight size={12} />
            </Link>
            <Link href="/parent/results" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Results <ArrowRight size={12} />
            </Link>
            <Link href="/parent/fees" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Fees <ArrowRight size={12} />
            </Link>
          </div>
        </InfoNote>
      )}

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
          {children.map((c) => <ParentDashboardChildCard key={c.id} child={c} />)}
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
