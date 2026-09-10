'use client';

import Link from 'next/link';
import {
  School, CalendarClock, Users, Bell, CreditCard, ArrowRight, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTerminology } from '@/lib/terminology';
import { DashboardSchoolCard } from '@/components/dashboards/DashboardSchoolCard';

/**
 * Shown instead of the normal widget stack when a teacher has zero
 * classes/sections assigned yet — i.e. before there's ANY real timetable,
 * attendance, or exam data to show. The old behavior here was a near-blank
 * page (just a header + an empty "teaching now" card), which read as broken
 * rather than "setup pending." This is deliberately not a single generic
 * "nothing here" message — it explains WHY it's empty (an admin step, not a
 * bug), what will appear once that's done, and gives the teacher a couple
 * of genuinely useful things to do in the meantime (their own ID card,
 * notices, profile) so the page still has real value on day one.
 */
export function TeacherDashboardEmptyState() {
  const terminology = useTerminology();

  const upNext = [
    { icon: School, text: `You're assigned to a ${terminology.classUnit.toLowerCase()} & ${terminology.sectionPlural.toLowerCase()}` },
    { icon: CalendarClock, text: 'Your admin sets your weekly timetable' },
    { icon: Users, text: 'Your students, schedule and attendance appear here automatically' },
  ];

  const meanwhile = [
    { icon: CreditCard, title: 'Set up your ID card', description: 'Add your details and photo so it\'s ready the moment you\'re assigned.', href: '/my-id-card' },
    { icon: Bell, title: 'Check notices', description: 'See announcements from your institution.', href: '/teacher/notices' },
  ];

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        {/* Soft decorative backdrop — a few offset circles rather than a
            stock illustration, keeps this dependency-free and on-brand. */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-soft opacity-60" />
        <div className="pointer-events-none absolute -right-2 top-16 h-16 w-16 rounded-full bg-primary-soft opacity-40" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
            <Sparkles size={12} /> Almost ready
          </span>
          <h2 className="mt-3 text-xl font-semibold text-foreground">Your dashboard is warming up</h2>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            You're all set up on your account — your school just hasn't assigned you to a{' '}
            {terminology.classUnit.toLowerCase()} or {terminology.sectionPlural.toLowerCase()} yet. Once they do, this
            page fills in with your real schedule, classes and attendance automatically. Nothing for you to do here.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {upNext.map(({ icon: Icon, text }, i) => (
              <div key={text} className="flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3.5 py-2.5 sm:flex-1">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                  {i + 1}
                </span>
                <Icon size={15} className="shrink-0 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">In the meantime</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {meanwhile.map(({ icon: Icon, title, description, href }) => (
              <Card key={title} className="flex items-start gap-3.5 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                  <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Open <ArrowRight size={12} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <DashboardSchoolCard />
      </div>
    </div>
  );
}
