import type { Metadata } from 'next';
import { AccountantDashboard } from '@/components/dashboards/AccountantDashboard';

export const metadata: Metadata = { title: 'Accountant Dashboard' };

export default function Page() {
  return <AccountantDashboard />;
}
