import type { Metadata } from 'next';
import { RegisterView } from '@/components/auth/RegisterView';

export const metadata: Metadata = {
  title: 'Create Your Account',
  description: 'Start your free 14-day Marksly trial — no credit card required. Set up attendance, fees, exams, and parent messaging for your institution.',
  alternates: { canonical: '/register' },
};

export default function Page() {
  return <RegisterView />;
}
