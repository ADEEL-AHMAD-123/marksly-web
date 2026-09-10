import { RoleGuard } from '@/components/layout/RoleGuard';

// Billing/plan management is admin (and in some places accountant) only —
// staff has no backend access.
export default function AdminBillingLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
