import type { Metadata } from 'next';
import { NoticesView } from '@/components/notices/NoticesView';

export const metadata: Metadata = { title: 'Notices' };

export default function Page() {
  return <NoticesView />;
}
