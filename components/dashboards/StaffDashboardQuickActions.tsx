'use client';

import Link from 'next/link';
import { Megaphone, Users, CalendarCheck, DollarSign } from 'lucide-react';

// "Post a notice" leads deliberately — it's staff's one genuine write
// capability on the backend (notification.routes.ts's canManage includes
// 'staff'), everything else here is a read-only jump-off, not an action.
const ACTIONS = [
  { icon: Megaphone, label: 'Post a notice', href: '/admin/notices' },
  { icon: Users, label: 'View students', href: '/admin/students' },
  { icon: CalendarCheck, label: 'View attendance', href: '/admin/attendance' },
  { icon: DollarSign, label: 'View fees', href: '/admin/fees' },
];

export function StaffDashboardQuickActions() {
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
