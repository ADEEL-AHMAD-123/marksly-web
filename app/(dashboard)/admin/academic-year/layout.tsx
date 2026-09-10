import { RoleGuard } from '@/components/layout/RoleGuard';

// Institution academic-year/term setup is a one-time admin configuration
// step, not something staff reads or writes day to day.
export default function AdminAcademicYearLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
