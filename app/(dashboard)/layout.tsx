'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Navbar } from '@/components/layout/Navbar';
import { LayoutProvider } from '@/components/layout/layout-context';
import { ForcePasswordChangeGate } from '@/components/auth/ForcePasswordChangeGate';
import { useAppSelector } from '@/store/hooks';

// Role-vs-route access control (a teacher hitting an admin-only URL, etc.)
// is handled per role tree by <RoleGuard> inside each of
// app/(dashboard)/{admin,teacher,student,parent,accountant,superadmin}/layout.tsx
// — this shared parent layout only needs the auth/loading gate below.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/login');
    }
  }, [accessToken, user, router]);

  if (!user || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user.mustChangePassword) {
    return <ForcePasswordChangeGate />;
  }

  return (
    <LayoutProvider>
      {/* Visually hidden until focused — the first tab stop on every
          dashboard page, so keyboard/screen-reader users can jump straight
          to content instead of tabbing through the full sidebar nav first
          on every single page load (audit P3). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}
