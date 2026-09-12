'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarClock, ArrowRight, PartyPopper, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useGetUpcomingExamsQuery } from '@/store/api/examsApi';
import { useGetHolidaysQuery } from '@/store/api/holidaysApi';

type UpcomingItem = {
  key: string;
  date: string;
  label: string;
  sublabel?: string;
  kind: 'exam' | 'holiday';
};

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.round((new Date(toDateKey(d)).getTime() - new Date(toDateKey(today)).getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Next 7 days, exams and holidays merged into one compact, date-sorted
 * list — an admin planning the week ahead shouldn't have to check two
 * separate pages to know "is anything happening Thursday". Exams come
 * from `/exams/upcoming` (already date-windowed and non-completed-only
 * server-side, see exam.service.ts's upcoming()); holidays reuse the same
 * `from`/`to` range client-side via holidaysApi's existing date-range
 * support (listHolidaysQuerySchema already accepts it).
 */
export function UpcomingCard() {
  const range = useMemo(() => {
    const now = new Date();
    const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { from: toDateKey(now), to: toDateKey(until) };
  }, []);

  const { data: examsRes, isLoading: examsLoading } = useGetUpcomingExamsQuery();
  const { data: holidaysRes, isLoading: holidaysLoading } = useGetHolidaysQuery(range);

  const loading = examsLoading || holidaysLoading;

  const items: UpcomingItem[] = useMemo(() => {
    const exams: UpcomingItem[] = (examsRes?.data ?? []).map((e) => ({
      key: `exam-${e.id}`,
      date: e.examDate,
      label: e.title,
      sublabel: e.className ? `${e.className} · ${e.type}` : e.type,
      kind: 'exam' as const,
    }));
    // Holiday dates are plain calendar dates (no time component) — the
    // from/to range above is already inclusive of today through +7 days,
    // so no further filtering is needed here.
    const holidays: UpcomingItem[] = (holidaysRes?.data ?? []).map((h) => ({
      key: `holiday-${h.id}`,
      date: h.date,
      label: h.reason,
      sublabel: h.scope === 'class' && h.className ? `${h.className}${h.section ? ` — ${h.section}` : ''}` : 'Institution-wide',
      kind: 'holiday' as const,
    }));
    return [...exams, ...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [examsRes?.data, holidaysRes?.data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><CalendarClock size={18} /> Upcoming (7 days)</CardTitle>
          <Link href="/admin/exams" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing scheduled this week"
            description="Exams and holidays in the next 7 days will show up here."
          />
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <span
                  className={
                    item.kind === 'holiday'
                      ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning'
                  }
                >
                  {item.kind === 'holiday' ? <PartyPopper size={15} /> : <FileText size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  {item.sublabel && <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>}
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{formatDay(item.date)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
