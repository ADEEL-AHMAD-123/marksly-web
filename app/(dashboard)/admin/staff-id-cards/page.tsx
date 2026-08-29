import type { Metadata } from 'next';
import { StaffIdCardsView } from '@/components/staff/StaffIdCardsView';

export const metadata: Metadata = { title: 'Staff ID Cards' };

export default function Page() {
  return <StaffIdCardsView />;
}
