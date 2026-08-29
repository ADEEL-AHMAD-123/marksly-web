import type { Metadata } from 'next';
import { StudentExamsView } from '@/components/portal/StudentViews';

export const metadata: Metadata = { title: 'Online Exams' };

export default function Page() {
  return <StudentExamsView />;
}
