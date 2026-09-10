import { RoleGuard } from '@/components/layout/RoleGuard';

// Bulk ID-card administration (GET /id-cards and related) is adminOnly —
// staff's own card is handled separately via the self-service /my-id-card
// route, not this bulk admin view.
export default function AdminIdCardsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>;
}
