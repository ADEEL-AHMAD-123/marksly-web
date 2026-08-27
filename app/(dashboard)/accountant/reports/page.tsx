import type { Metadata } from 'next';
import { ReportsView } from '@/components/reports/ReportsView';

export const metadata: Metadata = { title: 'Financial Reports' };

export default function Page() {
  return <ReportsView title="Financial Reports" />;
}
