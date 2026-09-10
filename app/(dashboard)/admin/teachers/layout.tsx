import { RoleGuard } from '@/components/layout/RoleGuard';

// Teacher management (list/create/bulk/reissue-cards/update/delete) is
// adminOnly in user.routes.ts — staff has no backend access to manage
// other staff members' accounts.
export default function AdminTeachersLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
