import { RoleGuard } from '@/components/layout/RoleGuard';

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['superadmin']}>{children}</RoleGuard>;
}
