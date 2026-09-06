import type { Metadata } from 'next';
import { EmailLogView } from '@/components/settings/EmailLogView';

export const metadata: Metadata = { title: 'Email Log' };

export default function Page() {
  return <EmailLogView />;
}
