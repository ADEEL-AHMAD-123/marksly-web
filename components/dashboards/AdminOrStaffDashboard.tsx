'use client';

import { useAppSelector } from '@/store/hooks';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { StaffDashboard } from '@/components/dashboards/StaffDashboard';

/**
 * `/admin` is shared between the 'admin' and 'staff' roles (see
 * ROLE_ROUTES.staff in lib/role-routes.ts and AdminLayout's RoleGuard) —
 * this is the client-side branch point between the two dashboards, kept as
 * its own small component so app/(dashboard)/admin/page.tsx can stay a
 * plain server component with a static <title> (role isn't known until
 * Redux hydrates client-side, so the branch itself has to be 'use client').
 */
export function AdminOrStaffDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  return user?.role === 'staff' ? <StaffDashboard /> : <AdminDashboard />;
}
