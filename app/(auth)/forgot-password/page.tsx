import type { Metadata } from 'next';
import { ForgotPasswordView } from '@/components/auth/ForgotPasswordView';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset the password for your Marksly account.',
};

export default function Page() {
  return <ForgotPasswordView />;
}
