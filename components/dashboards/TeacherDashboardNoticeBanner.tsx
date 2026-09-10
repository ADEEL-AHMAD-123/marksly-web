'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetNoticesQuery } from '@/store/api/noticesApi';

const SEVERITY_STYLE = {
  urgent: { icon: AlertCircle, classes: 'border-danger/30 bg-danger-soft', iconClasses: 'text-danger' },
  high: { icon: AlertTriangle, classes: 'border-warning/30 bg-warning-soft', iconClasses: 'text-warning' },
} as const;

/**
 * Surfaces urgent/high-priority notices right under the header, separate
 * from the regular "Notices" card further down the page — a time-sensitive
 * announcement (exam schedule change, emergency closure) shouldn't be
 * competing for attention with routine ones inside a scrollable list.
 *
 * Filters by priority server-side (not client-side over the default
 * publishedAt-sorted page) — with only a plain recency-sorted list, an
 * urgent notice could be pushed past a small `limit` by several more
 * recent low/normal-priority ones and never show up here at all.
 *
 * Dismiss is session-only (same pattern as DashboardAlertBanner/
 * TeacherDashboardIdCardNudge) — reappears on next visit since the notice
 * itself is still live, this only clears it for the rest of this visit.
 */
export function TeacherDashboardNoticeBanner() {
  const { data } = useGetNoticesQuery({ limit: 5, priority: ['urgent', 'high'] });
  const notices = data?.data ?? [];
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const items = notices.filter((n) => !dismissed.has(n.id));
  if (items.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {items.map((n) => {
        const style = SEVERITY_STYLE[n.priority as 'urgent' | 'high'];
        const Icon = style.icon;
        return (
          <div key={n.id} className={cn('flex items-start gap-3 rounded-xl border p-3.5 sm:items-center', style.classes)}>
            <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card sm:mt-0', style.iconClasses)}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{n.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {n.author ? `From ${n.author}` : 'From your institution'} · {new Date(n.publishedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href="/teacher/notices"
                className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-inset ring-border transition-colors hover:bg-muted"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => setDismissed((prev) => new Set(prev).add(n.id))}
                aria-label="Dismiss for now"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
