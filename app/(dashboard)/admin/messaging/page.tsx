import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MessagingView } from '@/components/messaging/MessagingView';

export const metadata: Metadata = { title: 'Messaging' };

export default function Page() {
  return (
    <Suspense>
      <MessagingView />
    </Suspense>
  );
}
