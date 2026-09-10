'use client';

import Link from 'next/link';
import { ClipboardCheck, FileText, CalendarDays, Users } from 'lucide-react';

const ACTIONS = [
  { icon: ClipboardCheck, label: 'Mark attendance', href: '/teacher/attendance' },
  { icon: FileText, label: 'Create exam', href: '/teacher/exams' },
  { icon: CalendarDays, label: 'Timetable', href: '/teacher/timetable' },
  { icon: Users, label: 'My roster', href: '/teacher/classes' },
];

/**
 * Only rendered once a teacher actually has at least one class (gated by
 * the caller) — before that, "mark attendance" or "create exam" would be
 * dead links to nothing. A flat 2x2/1x4 icon grid rather than a Card list,
 * since these are jump-off points, not content to read.
 */
export function TeacherDashboardQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {ACTIONS.map(({ icon: Icon, label, href }) => (
        <Link
          key={label}
          href={href}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/30 hover:bg-primary-soft"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Icon size={16} />
          </span>
          <p className="text-xs font-medium text-foreground">{label}</p>
        </Link>
      ))}
    </div>
  );
}
