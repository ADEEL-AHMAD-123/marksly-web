'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { roleHome } from '@/lib/role-routes';

/**
 * Route-level access control for the per-role dashboard trees (admin,
 * teacher, student, parent, accountant, superadmin).
 *
 * Previously this app only hid nav links per role (see nav-items.ts /
 * SidebarNav.tsx) — nothing actually stopped an authenticated user from
 * typing e.g. /admin/billing into the URL bar and loading it, regardless
 * of their real role. Real data was still protected server-side (every
 * backend module gates its own endpoints with requireRole()), so this was
 * never a data-leak bug, but a student landing on a half-broken admin page
 * that immediately 403s on every request is a bad, confusing experience —
 * and relying solely on the API to be the last line of defense for page
 * ACCESS (as opposed to data) isn't a habit worth keeping as more roles get
 * added. This wraps each role's top-level `layout.tsx` and redirects
 * mismatched roles to their own home instead of letting the page render.
 *
 * Deliberately does NOT duplicate the parent dashboard layout's
 * auth/loading gate (app/(dashboard)/layout.tsx already guarantees `user`
 * exists — with a spinner — before any of these role trees ever render) —
 * this only ever needs to decide allowed vs. not.
 */
export function RoleGuard({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const allowed = !!user && allow.includes(user.role);

  useEffect(() => {
    if (user && !allowed) {
      router.replace(roleHome(user.role));
    }
  }, [user, allowed, router]);

  if (!allowed) return null;

  return <>{children}</>;
}
