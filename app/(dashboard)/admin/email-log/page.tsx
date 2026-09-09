import type { Metadata } from 'next';
import { EmailLogView } from '@/components/settings/EmailLogView';

export const metadata: Metadata = { title: 'Email Delivery Status' };

export default function Page() {
  return <EmailLogView />;
}
