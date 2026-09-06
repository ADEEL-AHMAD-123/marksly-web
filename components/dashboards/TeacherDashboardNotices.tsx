'use client';

import Link from 'next/link';
import { Bell, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetNoticesQuery } from '@/store/api/noticesApi';
import type { NoticePriority } from '@/store/api/noticesApi';

const PRIORITY_VARIANT: Record<NoticePriority, 'danger' | 'warning' | 'primary' | 'neutral'> = {
  urgent: 'danger',
  high: 'warning',
  normal: 'primary',
  low: 'neutral',
};

/**
 * getNotices is already server-scoped to the caller's role (an admin
 * targets notices to specific roles, and this endpoint only returns ones
 * addressed to the current user) — there's no per-user "read" tracking in
 * the backend at all, so this deliberately shows "recent notices" rather
 * than claiming an "unread count" that doesn't exist.
 */
export function TeacherDashboardNotices() {
  const { data, isLoading } = useGetNoticesQuery({ limit: 3 });
  const notices = data?.data ?? [];

  if (isLoading) return <Card className="p-5"><Skeleton className="h-24 w-full" /></Card>;
  if (notices.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Bell size={18} /> Notices</CardTitle>
          <Link href="/teacher/notices" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {notices.map((n) => (
          <div key={n.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              {n.priority !== 'normal' && (
                <Badge variant={PRIORITY_VARIANT[n.priority]} className="shrink-0 capitalize">{n.priority}</Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(n.publishedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              {n.author ? ` · ${n.author}` : ''}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
