import { RoleGuard } from '@/components/layout/RoleGuard';

// Staff account management (list/create/bulk/update/delete other staff
// members) is adminOnly in user.routes.ts — a staff member managing their
// own peers' accounts is exactly the access boundary this page exists to
// enforce, not something to relax.
export default function AdminStaffLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
