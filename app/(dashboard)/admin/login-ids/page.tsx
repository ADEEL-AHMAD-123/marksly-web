import type { Metadata } from 'next';
import { LoginIdsView } from '@/components/login-ids/LoginIdsView';

export const metadata: Metadata = { title: 'Login IDs & PINs' };

export default function Page() {
  return <LoginIdsView />;
}
