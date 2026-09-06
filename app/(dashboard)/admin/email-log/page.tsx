import type { Metadata } from 'next';
import { EmailLogView } from '@/components/settings/EmailLogView';

export const metadata: Metadata = { title: 'Login Emails' };

export default function Page() {
  return <EmailLogView />;
}
