'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, AlertCircle, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetDashboardAlertsQuery, type DashboardAlert } from '@/store/api/dashboardAlertsApi';

// Generic enough to also carry future editorial "we shipped a new feature"
// announcements alongside the live-detected issues below — same visual
// treatment, same dismiss/CTA mechanics, just a different `kind` and no
// underlying data to resolve. Not wired to a real announcements source yet;
// this is the shape that source will plug into once it exists.
interface BannerItem {
  key: string;
  kind: 'issue' | 'announcement';
  severity: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  count?: number;
  ctaLabel?: string;
  ctaHref?: string;
}

const SEVERITY_STYLE: Record<BannerItem['severity'], { icon: typeof AlertTriangle; classes: string; iconClasses: string }> = {
  danger: {
    icon: AlertCircle,
    classes: 'border-danger/30 bg-danger-soft',
    iconClasses: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-warning/30 bg-warning-soft',
    iconClasses: 'text-warning',
  },
  info: {
    icon: Megaphone,
    classes: 'border-primary/30 bg-primary-soft',
    iconClasses: 'text-primary',
  },
};

function toBannerItem(alert: DashboardAlert): BannerItem {
  return {
    key: alert.key,
    kind: 'issue',
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    count: alert.count,
    ctaLabel: alert.ctaLabel,
    ctaHref: alert.ctaHref,
  };
}

/**
 * Admin-dashboard banner stack — surfaces things that actually need action
 * (right now: login-email delivery problems, an unconfirmed institution
 * name) as ONE grouped message per issue kind, however many underlying
 * occurrences it represents (e.g. "5 emails need attention", never 5
 * separate banners) with a direct "fix it" link to the right page.
 *
 * The same underlying issues also sync into the notification bell (see
 * dashboard-alerts.service.ts's syncAndGetAlerts()) and can trigger a sound
 * there (NotificationBell.tsx) — this banner is the loud, hard-to-miss
 * surface for while the dashboard is actually open; the bell is the durable
 * record for afterward.
 */
export function DashboardAlertBanner() {
  const router = useRouter();
  const { data } = useGetDashboardAlertsQuery(undefined, { pollingInterval: 60_000 });
  const alerts = data?.data ?? [];
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const items = alerts.map(toBannerItem).filter((item) => !dismissed.has(item.key));
  if (items.length === 0) return null;

  return (
    <div className="mb-6 space-y-2.5">
      {items.map((item) => {
        const style = SEVERITY_STYLE[item.severity];
        const Icon = style.icon;
        return (
          <div
            key={item.key}
            className={cn('flex items-start gap-3 rounded-xl border p-3.5 sm:items-center', style.classes)}
          >
            <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card sm:mt-0', style.iconClasses)}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.message}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {item.ctaHref && (
                <button
                  type="button"
                  onClick={() => router.push(item.ctaHref!)}
                  className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-inset ring-border transition-colors hover:bg-muted"
                >
                  {item.ctaLabel ?? 'View'}
                </button>
              )}
              {/* Issues resolve themselves once the underlying data is
                  fixed (see getActiveAlerts()) — this only hides the banner
                  for the rest of this visit, not permanently, so a real
                  unresolved problem doesn't get silently buried. */}
              <button
                type="button"
                onClick={() => setDismissed((prev) => new Set(prev).add(item.key))}
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
