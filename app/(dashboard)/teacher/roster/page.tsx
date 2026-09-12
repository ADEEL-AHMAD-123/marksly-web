import type { Metadata } from 'next';
import { ClassRosterView } from '@/components/students/ClassRosterView';

export const metadata: Metadata = { title: 'Students' };

export default function Page() {
  return <ClassRosterView mode="teacher" />;
}
