/** Home route for each role after login or a role switch. */
export const ROLE_ROUTES: Record<string, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
  accountant: '/accountant',
  staff: '/admin',
};

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  accountant: 'Accountant',
  staff: 'Staff',
};

export function roleHome(role: string): string {
  return ROLE_ROUTES[role] || '/admin';
}
