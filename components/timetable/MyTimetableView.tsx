'use client';

import { PageHeader } from '@/components/ui/page-header';
import { TimetableWeekGrid } from './TimetableWeekGrid';
import { TimetableEntry, useMyTeacherTimetableQuery, useMyStudentTimetableQuery } from '@/store/api/timetableApi';

export function MyTimetableView({ role }: { role: 'teacher' | 'student' }) {
  const teacherQ = useMyTeacherTimetableQuery(undefined, { skip: role !== 'teacher' });
  const studentQ = useMyStudentTimetableQuery(undefined, { skip: role !== 'student' });
  const res = role === 'teacher' ? teacherQ : studentQ;
  const entries: TimetableEntry[] = res.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Timetable" description="Your weekly class schedule." />
      <TimetableWeekGrid
        entries={entries}
        isLoading={res.isLoading}
        variant={role === 'teacher' ? 'teacher' : 'viewer'}
      />
    </div>
  );
}
