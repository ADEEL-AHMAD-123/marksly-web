'use client';

import Link from 'next/link';
import { Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { useGetPublicPlansQuery, type Plan } from '@/store/api/plansApi';

// Maps the internal plan feature-flag keys (plan.model.ts) to a real,
// honest label. Deliberately doesn't include every flag defined in the
// backend's DEFAULT_PLANS ('aiReports', 'multibranch') — those aren't
// wired to any actual functionality anywhere in marksly-api yet, so
// advertising them here would be a claim the product can't back up.
const FEATURE_LABELS: Record<string, string> = {
  whatsapp: 'SMS & WhatsApp messaging',
};

function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function planFeatures(plan: Plan, previousName?: string): string[] {
  const base = [
    `Up to ${plan.studentsLimit.toLocaleString('en-PK')} students`,
    `${plan.storageGB} GB storage`,
  ];
  if (previousName) base.push(`Everything in ${previousName}`);
  const flagLabels = plan.features.map((f) => FEATURE_LABELS[f]).filter((label): label is string => Boolean(label));
  return [...base, ...flagLabels];
}

export function PricingPlans() {
  const { data, isLoading, isError } = useGetPublicPlansQuery();
  const plans = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-card/60" />
        ))}
      </div>
    );
  }

  if (isError || plans.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
        <AlertTriangle aria-hidden size={22} className="text-warning" />
        <p className="mt-3 text-sm text-muted-foreground">
          Couldn’t load current pricing right now.{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">Contact us</Link> for plan details.
        </p>
      </div>
    );
  }

  // "Most popular" — the growth tier if the catalog has one, otherwise the
  // second-cheapest plan (a reasonable default highlight for any catalog shape).
  const highlightKey = plans.some((p) => p.key === 'growth') ? 'growth' : plans[1]?.key;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
      {plans.map((plan, i) => {
        const highlight = plan.key === highlightKey;
        const isFree = plan.price === 0;
        return (
          <div
            key={plan.key}
            className={`relative flex flex-col rounded-2xl border p-4 sm:p-6 ${
              highlight ? 'border-accent bg-card shadow-xl ring-1 ring-accent/30' : 'border-border bg-card shadow-sm'
            }`}
          >
            {highlight && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground shadow sm:-top-3 sm:left-6 sm:px-3 sm:py-1 sm:text-xs">
                Most popular
              </span>
            )}
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <h2 className="text-base font-semibold sm:text-lg">{plan.name}</h2>
              <div className="text-xl font-bold text-primary sm:mt-2 sm:text-3xl">
                {isFree ? 'Free' : formatPKR(plan.price)}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{isFree ? 'No card required' : 'per month'}</p>
            <ul className="mt-4 flex-1 space-y-2 sm:mt-5 sm:space-y-2.5">
              {planFeatures(plan, i > 0 ? plans[i - 1].name : undefined).map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-[13px] sm:text-sm">
                  <Check aria-hidden size={15} className="mt-0.5 shrink-0 text-success" /> <span>{feat}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`${buttonVariants({ variant: highlight ? 'primary' : 'secondary' })} mt-5 w-full sm:mt-6 ${highlight ? '!bg-accent !text-accent-foreground hover:!bg-accent/90' : ''}`}
            >
              {isFree ? 'Start free' : 'Start free trial'} {highlight && <ArrowRight aria-hidden size={16} />}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
