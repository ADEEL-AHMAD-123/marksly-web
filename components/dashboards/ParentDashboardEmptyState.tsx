'use client';

import Link from 'next/link';
import { GraduationCap, Bell, UserCog, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DashboardSchoolCard } from '@/components/dashboards/DashboardSchoolCard';

/**
 * Shown when a parent account has zero children linked yet — previously
 * this was just a generic inline `EmptyState` ("No children linked" +
 * one line of text) with nothing else on the page, the emptiest of any
 * role's dashboard. Same honest-explanation pattern as
 * TeacherDashboardEmptyState/StudentDashboardEmptyState: this is a
 * pending-institution-step state (the school links a parent to their
 * child's record, a parent can't self-link), not a broken page — and it
 * still gives the parent something real to do and to look at.
 */
export function ParentDashboardEmptyState() {
  const meanwhile = [
    { icon: Bell, title: 'Check notices', description: 'See announcements from your institution.', href: '/parent/notices' },
    { icon: UserCog, title: 'Review your profile', description: 'Make sure your contact details are correct.', href: '/parent/settings' },
  ];

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-soft opacity-60" />
        <div className="pointer-events-none absolute -right-2 top-16 h-16 w-16 rounded-full bg-primary-soft opacity-40" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
            <Sparkles size={12} /> Almost ready
          </span>
          <h2 className="mt-3 text-xl font-semibold text-foreground">No children linked yet</h2>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            Your account is ready — your institution just hasn't linked your child's record to it yet. Once they do,
            this page fills in automatically with their attendance, results and fees. Contact your institution's
            office if you were expecting this already.
          </p>

          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3.5 py-2.5">
            <GraduationCap size={15} className="shrink-0 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">Your institution links each child to a parent account from their student record</p>
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
