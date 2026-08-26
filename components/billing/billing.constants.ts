import {
  CheckCircle2, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import type { Gateway } from '@/store/api/billingApi';

// `myBilling()` already returns page 1 of payment history at this page
// size — "Load more" fetches subsequent pages at the same page size so they
// line up with no gap or overlap.
export const PAYMENTS_PAGE_SIZE = 10;

export const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'primary'> = {
  active: 'success', trial: 'primary', past_due: 'warning', suspended: 'danger', cancelled: 'neutral', expired: 'neutral',
};
export const payBadge: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  success: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral',
};
export const payIcon: Record<string, React.ElementType> = {
  success: CheckCircle2, pending: Clock, failed: XCircle, refunded: RefreshCw,
};

export const gatewayLabel: Record<Gateway, string> = {
  safepay: 'Pay with Safepay',
  jazzcash: 'Pay with JazzCash',
  easypaisa: 'Pay with EasyPaisa',
};

export const declineReasonLabel: Record<string, string> = {
  insufficient_funds: 'insufficient funds',
  expired_card: 'the card has expired',
  card_blocked: 'the card was declined by the issuer',
  auth_failed: 'authentication failed',
  gateway_error: 'a temporary payment gateway issue',
  other: 'the card issuer',
};

export type Step = 'summary' | 'plans' | 'payment';

export const STEPS: { key: Step; label: string }[] = [
  { key: 'summary', label: 'Overview' },
  { key: 'plans', label: 'Choose plan' },
  { key: 'payment', label: 'Pay' },
];
