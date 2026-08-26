import type { Metadata } from 'next';
import { LoginView } from '@/components/auth/LoginView';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Marksly account to manage attendance, fees, exams, and more for your institution.',
  alternates: { canonical: '/login' },
};

export default function Page() {
  return <LoginView />;
}
