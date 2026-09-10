import type { Metadata } from 'next';
import { AnnouncementsView } from '@/components/superadmin/AnnouncementsView';

export const metadata: Metadata = { title: 'Announcements' };

export default function Page() {
  return <AnnouncementsView />;
}
