import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConfirmEmailChangeView } from '@/components/auth/ConfirmEmailChangeView';

export const metadata: Metadata = { title: 'Confirm Email Change' };

export default function Page() {
  return (
    <Suspense>
      <ConfirmEmailChangeView />
    </Suspense>
  );
}
