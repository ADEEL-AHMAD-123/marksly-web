import type { Metadata } from 'next';
import { MessagingView } from '@/components/messaging/MessagingView';

export const metadata: Metadata = { title: 'Messaging' };

export default function Page() {
  return <MessagingView />;
}
