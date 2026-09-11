import type { Metadata } from 'next';
import { StaffManagementView } from '@/components/staff/StaffManagementView';

export const metadata: Metadata = { title: 'Staff' };

export default function Page() {
  return <StaffManagementView />;
}
