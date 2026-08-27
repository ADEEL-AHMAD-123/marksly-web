import { RoleGuard } from '@/components/layout/RoleGuard';

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['accountant']}>{children}</RoleGuard>;
}
