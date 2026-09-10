import { RoleGuard } from '@/components/layout/RoleGuard';

// Question bank writes ride the exam module's canWrite guard
// (requireRole(['admin', 'teacher'])) — staff has no backend access.
export default function AdminQuestionBankLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
