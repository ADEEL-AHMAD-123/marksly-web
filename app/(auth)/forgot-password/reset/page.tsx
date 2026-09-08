import type { Metadata } from 'next';
import { ResetPasswordView } from '@/components/auth/ResetPasswordView';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Choose a new password for your Marksly account.',
};

export default function Page() {
  return <ResetPasswordView />;
}
