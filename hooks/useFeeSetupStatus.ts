'use client';

import { useGetFeeStructuresQuery, useGetPayoutAccountsQuery } from '@/store/api/feesApi';
import { useGetActiveTermsQuery } from '@/store/api/termsApi';

/**
 * A single source of truth for "how far along is fee setup" — powers the
 * Fees page's own status strip/empty states AND (via the exact same
 * queries) stays consistent with the dashboard onboarding checklist and
 * Settings' "Setup checklist" tab, which independently check fee
 * structures/payout accounts too. Deliberately scoped to just the two
 * fee-specific pieces (structures, payout account) rather than the whole
 * institution checklist (logo, classes, teachers, etc.) — those belong to
 * the general onboarding flow, not this page.
 *
 * `isPartial` (structures exist, no payout account, or vice versa) is the
 * state worth calling out with real urgency: it means challans are
 * ALREADY being generated, right now, without payment instructions on
 * them — materially worse than "hasn't started yet."
 */
export function useFeeSetupStatus() {
  const { data: structRes, isLoading: structLoading } = useGetFeeStructuresQuery();
  const structures = structRes?.data ?? [];
  const hasStructures = structures.length > 0;

  const { data: payoutRes, isLoading: payoutLoading } = useGetPayoutAccountsQuery();
  const hasPayoutAccount = (payoutRes?.data ?? []).length > 0;

  const { data: termsRes, isLoading: termsLoading } = useGetActiveTermsQuery();
  const hasActiveTerm = (termsRes?.data ?? []).length > 0;

  const isLoading = structLoading || payoutLoading || termsLoading;
  const isNotStarted = !isLoading && !hasStructures && !hasPayoutAccount;
  const isComplete = !isLoading && hasStructures && hasPayoutAccount;
  const isPartial = !isLoading && !isNotStarted && !isComplete;

  return {
    isLoading,
    hasActiveTerm,
    hasStructures,
    hasPayoutAccount,
    isNotStarted,
    isPartial,
    isComplete,
    structureCount: structures.length,
  };
}
