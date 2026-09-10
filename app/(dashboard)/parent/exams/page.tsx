import type { Metadata } from 'next';
import { ParentExamsView } from '@/components/portal/ParentExamsView';

export const metadata: Metadata = { title: 'Online Exams' };

export default function Page() {
  return <ParentExamsView />;
}
