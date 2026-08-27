import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarCheck,
  DollarSign, FileText, Bell, BarChart2, Settings, School,
  Package, CalendarRange, CalendarClock, CreditCard, MessageSquare,
  FlaskConical, Briefcase,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Students', href: '/admin/students', icon: GraduationCap },
    { label: 'ID Cards', href: '/admin/id-cards', icon: CreditCard },
    { label: 'Teachers', href: '/admin/teachers', icon: Users },
    { label: 'Staff', href: '/admin/staff', icon: Briefcase },
    { label: 'Classes', href: '/admin/classes', icon: School },
    { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
    { label: 'Timetable', href: '/admin/timetable', icon: CalendarClock },
    { label: 'Academic Year', href: '/admin/academic-year', icon: CalendarRange },
    { label: 'Attendance', href: '/admin/attendance', icon: CalendarCheck },
    { label: 'Fees', href: '/admin/fees', icon: DollarSign },
    { label: 'Exams', href: '/admin/exams', icon: FileText },
    { label: 'Notices', href: '/admin/notices', icon: Bell },
    { label: 'Messaging', href: '/admin/messaging', icon: MessageSquare },
    { label: 'Reports', href: '/admin/reports', icon: BarChart2 },
    { label: 'Billing', href: '/admin/billing', icon: CreditCard },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  teacher: [
    { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
    { label: 'My Classes', href: '/teacher/classes', icon: School },
    { label: 'Timetable', href: '/teacher/timetable', icon: CalendarClock },
    { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
    { label: 'Exams', href: '/teacher/exams', icon: FileText },
    { label: 'Notices', href: '/teacher/notices', icon: Bell },
  ],
  student: [
    { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { label: 'Subjects', href: '/student/subjects', icon: BookOpen },
    { label: 'Timetable', href: '/student/timetable', icon: CalendarClock },
    { label: 'Attendance', href: '/student/attendance', icon: CalendarCheck },
    { label: 'Results', href: '/student/results', icon: FileText },
    { label: 'Fees', href: '/student/fees', icon: DollarSign },
    { label: 'Notices', href: '/student/notices', icon: Bell },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
    { label: 'My Children', href: '/parent/children', icon: GraduationCap },
    { label: 'Attendance', href: '/parent/attendance', icon: CalendarCheck },
    { label: 'Fees', href: '/parent/fees', icon: DollarSign },
    { label: 'Results', href: '/parent/results', icon: FileText },
    { label: 'Notices', href: '/parent/notices', icon: Bell },
  ],
  accountant: [
    { label: 'Dashboard', href: '/accountant', icon: LayoutDashboard },
    { label: 'Fees & Payments', href: '/accountant/fees', icon: DollarSign },
    { label: 'Reports', href: '/accountant/reports', icon: BarChart2 },
    { label: 'Messaging', href: '/accountant/messaging', icon: MessageSquare },
    { label: 'Notices', href: '/accountant/notices', icon: Bell },
    { label: 'Settings', href: '/accountant/settings', icon: Settings },
  ],
  superadmin: [
    { label: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
    { label: 'Institutions', href: '/superadmin/institutions', icon: School },
    { label: 'Plans', href: '/superadmin/plans', icon: Package },
    { label: 'Payments', href: '/superadmin/billing', icon: CreditCard },
    { label: 'Fee Payouts', href: '/superadmin/fee-payouts', icon: DollarSign },
    { label: 'Revenue', href: '/superadmin/revenue', icon: DollarSign },
    { label: 'Analytics', href: '/superadmin/analytics', icon: BarChart2 },
    { label: 'Testing', href: '/superadmin/testing', icon: FlaskConical },
    { label: 'Settings', href: '/superadmin/settings', icon: Settings },
  ],
};
