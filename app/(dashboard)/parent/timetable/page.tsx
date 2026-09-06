import type { Metadata } from 'next';
import { ParentScopedView } from '@/components/portal/ParentViews';

export const metadata: Metadata = { title: "Child's Timetable" };

export default function Page() {
  return <ParentScopedView kind="timetable" />;
}
