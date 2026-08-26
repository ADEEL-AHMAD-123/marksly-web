import type { Metadata } from 'next';
import { FeePayoutsView } from '@/components/fees-online/FeePayoutsView';

export const metadata: Metadata = { title: 'Fee Payouts' };

export default function Page() {
  return <FeePayoutsView />;
}
