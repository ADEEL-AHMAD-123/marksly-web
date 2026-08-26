import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { GrowthPlanCard } from '@/components/marketing/GrowthPlanCard';

export function HomePricingTeaser() {
  return (
    <section className="border-t border-sidebar-border bg-sidebar py-14 text-sidebar-foreground sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 text-center sm:gap-10 lg:grid-cols-2 lg:text-left">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pricing</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Simple, fair pricing</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-sidebar-muted sm:text-base lg:mx-0">
            Free for up to 50 students, no card required. Upgrade to Growth as your institution
            grows, or talk to us about a custom plan for multiple campuses.
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
