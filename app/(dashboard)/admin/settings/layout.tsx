import { RoleGuard } from '@/components/layout/RoleGuard';

// Institution settings writes are admin-only on the backend (canManage =
// requireRole(['admin']) in institution.routes.ts) — staff has no access
// here at all, not even read, so the page is locked out entirely rather
// than rendered read-only.
export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
