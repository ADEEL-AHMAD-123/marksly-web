import { RoleGuard } from '@/components/layout/RoleGuard';

// Bulk Login ID/PIN lookup across every role is an admin-only surface, same
// boundary as the Staff management page itself (see admin/staff/layout.tsx)
// — a staff member browsing every other account's PIN reset controls is
// exactly the access boundary this page exists to enforce.
export default function AdminLoginIdsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
