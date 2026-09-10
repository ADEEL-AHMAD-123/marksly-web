import { RoleGuard } from '@/components/layout/RoleGuard';

// Email delivery status is fetched with `skip: role !== 'admin'` already
// in SidebarNav.tsx's badge query — this closes the same gap at the page
// level, since the nav item itself was still reachable by URL before.
export default function AdminEmailLogLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
