import { RoleGuard } from '@/components/layout/RoleGuard';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['student']}>{children}</RoleGuard>;
}
