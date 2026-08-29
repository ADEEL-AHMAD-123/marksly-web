'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { roleHome } from '@/lib/role-routes';

/**
 * Deliberately a SEPARATE top-level route group from `(dashboard)` — the
 * exam-taking screen needs to be full-viewport, minimal-chrome (no
 * Sidebar/Navbar) so a student's attention stays on the timer/questions and
 * a stray sidebar click can't leave the exam. `(dashboard)/layout.tsx`
 * always renders Sidebar+Navbar around its children with no opt-out, so
 * this route intentionally lives outside that group's URL subtree instead
 * of trying to CSS-override the shell from inside it.
 *
 * Reimplements the same auth-gate spinner as `(dashboard)/layout.tsx`
 * (this route isn't nested under it, so that gate doesn't run here) plus a
 * student-only check, since only students ever take an exam.
 */
export default function ExamLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/login');
    } else if (user.role !== 'student') {
      router.replace(roleHome(user.role));
    }
  }, [accessToken, user, router]);

  if (!user || !accessToken || user.role !== 'student') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
