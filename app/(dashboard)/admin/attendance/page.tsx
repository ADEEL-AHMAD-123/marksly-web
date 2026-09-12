import type { Metadata } from 'next';
import { AttendanceView } from '@/components/attendance/AttendanceView';

export const metadata: Metadata = { title: 'Attendance Report' };

export default function Page() {
  return <AttendanceView title="Attendance Report" />;
}
