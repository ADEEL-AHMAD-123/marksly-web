import type { Metadata } from 'next';
import { AcademicYearView } from '@/components/academic/AcademicYearView';

export const metadata: Metadata = { title: 'Academic Terms' };

export default function Page() {
  return <AcademicYearView />;
}
