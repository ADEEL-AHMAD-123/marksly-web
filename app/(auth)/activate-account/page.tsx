import type { Metadata } from 'next';
import { ActivateAccountView } from '@/components/auth/ActivateAccountView';

export const metadata: Metadata = {
  title: 'Activate Your Account',
  description: 'Set your password to finish activating your Marksly account.',
};

export default function Page() {
  return <ActivateAccountView />;
}
