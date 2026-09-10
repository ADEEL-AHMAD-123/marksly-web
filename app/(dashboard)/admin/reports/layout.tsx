import { RoleGuard } from '@/components/layout/RoleGuard';

// GET /dashboard (report.routes.ts) is requireRole(['admin', 'accountant'])
// — staff has no backend read access here.
export default function AdminReportsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
