import { RoleGuard } from '@/components/layout/RoleGuard';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['parent']}>{children}</RoleGuard>;
}
