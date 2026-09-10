import { RoleGuard } from '@/components/layout/RoleGuard';

// 'staff' is included deliberately — its own ROLE_ROUTES home is '/admin',
// and it has real backend read access to several of these screens
// (students, classes, subjects, exams, attendance, fees, timetable) plus
// full access to notices — see nav-items.ts's `staff` array. Subroutes
// staff has NO backend access to (teachers/staff mgmt, billing, settings,
// reports, academic-year setup, question bank, bulk id-cards, email log)
// each have their OWN nested layout.tsx with `allow={['admin']}` only —
// Next.js composes nested layouts, so this top-level guard still applies
// first, then the stricter one underneath narrows it further for those
// specific pages.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin', 'staff']}>{children}</RoleGuard>;
}
