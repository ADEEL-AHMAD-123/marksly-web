import { RoleGuard } from '@/components/layout/RoleGuard';

// 'staff' is included deliberately — its own ROLE_ROUTES home is '/admin'
// and it has no dedicated nav array (NAV_ITEMS falls back to the full
// admin nav for it), so staff has always used these same admin screens.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin', 'staff']}>{children}</RoleGuard>;
}
