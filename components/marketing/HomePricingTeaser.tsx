'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { GrowthPlanCard } from '@/components/marketing/GrowthPlanCard';
import { useGetPublicPlansQuery } from '@/store/api/plansApi';

// Previously hardcoded "up to 50 students" here — if a superadmin ever
// changes the free plan's studentsLimit (plan.model.ts, editable via the
// superadmin plans UI), this marketing copy would silently go stale while
// GrowthPlanCard right next to it already pulls live data. Same
// useGetPublicPlansQuery() call GrowthPlanCard uses, so this can't drift.
export function HomePricingTeaser() {
  const { data } = useGetPublicPlansQuery();
  const freePlan = data?.data.find((p) => p.key === 'free') ?? data?.data[0];
  const freeLimit = freePlan?.studentsLimit;

  return (
    <section className="border-t border-sidebar-border bg-sidebar py-14 text-sidebar-foreground sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 text-center sm:gap-10 lg:grid-cols-2 lg:text-left">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pricing</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Simple, fair pricing</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-sidebar-muted sm:text-base lg:mx-0">
            Free for up to {freeLimit ? freeLimit.toLocaleString('en-PK') : '50'} students, no card required.
            Upgrade to Growth as your institution grows, or talk to us about a custom plan for
            multiple campuses.
          </p>
          <Link href="/pricing" className={`${buttonVariants({ size: 'lg' })} mt-6 w-full !bg-accent !text-accent-foreground hover:!bg-accent/90 sm:mt-7 sm:w-auto`}>
            View pricing <ArrowRight aria-hidden size={18} />
          </Link>
        </div>
        <GrowthPlanCard />
      </div>
    </section>
  );
}
