'use client';

import { Check } from 'lucide-react';
import { useGetPublicPlansQuery } from '@/store/api/plansApi';

function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

// storageGB can be a fraction (e.g. 0.5 = 500MB) — real usage here is just
// institution logos + per-user profile photos, so smaller tiers are
// genuinely sub-1GB rather than rounded up to a dishonest "1 GB".
function formatStorage(storageGB: number): string {
  if (storageGB < 1) return `${Math.round(storageGB * 1024)} MB storage`;
  return `${storageGB} GB storage`;
}

/** Homepage pricing-teaser card — same live plan data as /pricing, so this
 *  can't silently drift out of sync with what billing.service.ts charges.
 *  Despite the filename, this shows the 'standard' plan (named "Growth" as
 *  of the 2026 pricing revision — see plan.model.ts's DEFAULT_PLANS) since
 *  that's the mid-priced tier PricingPlans.tsx also highlights as "Most
 *  popular". Not renamed to avoid an unnecessary file-rename diff.
 *
 *  Only shows student/storage capacity here — the full real feature list
 *  (attendance, exams, fees, ID cards, etc., identical across every paid
 *  plan) lives on /pricing itself; this teaser stays short on purpose. */
export function GrowthPlanCard() {
  const { data, isLoading } = useGetPublicPlansQuery();
  const plans = data?.data ?? [];
  const plan = plans.find((p) => p.key === 'standard') ?? plans[1] ?? plans[0];

  if (isLoading || !plan) {
    return <div className="h-56 animate-pulse rounded-2xl border border-sidebar-border bg-sidebar-accent/40" />;
  }

  const bullets = [
    `Up to ${plan.studentsLimit.toLocaleString('en-PK')} students`,
    formatStorage(plan.storageGB),
    'Attendance, exams, fees, ID cards & more',
  ];

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-5 text-left sm:p-6">
      <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">Most popular</span>
      <p className="mt-4 text-sm text-sidebar-muted">{plan.name} plan</p>
      <p className="text-2xl font-bold sm:text-3xl">
        {plan.price === 0 ? 'Free' : formatPKR(plan.price)}
        {plan.price > 0 && <span className="text-sm font-normal text-sidebar-muted sm:text-base">/mo</span>}
      </p>
      <ul className="mt-4 space-y-2 text-[13px] sm:text-sm">
        {bullets.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check aria-hidden size={14} className="shrink-0 text-accent" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
