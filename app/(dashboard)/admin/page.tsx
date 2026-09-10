import type { Metadata } from 'next';
import { AdminOrStaffDashboard } from '@/components/dashboards/AdminOrStaffDashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return <AdminOrStaffDashboard />;
}
