import { RoleGuard } from '@/components/layout/RoleGuard';

// Bulk staff ID-card reissue is adminOnly — same reasoning as
// admin/id-cards and admin/staff.
export default function AdminStaffIdCardsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
