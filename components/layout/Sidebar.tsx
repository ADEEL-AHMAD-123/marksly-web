'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayout } from './layout-context';
import { SidebarNav } from './SidebarNav';

/** Desktop sidebar — hidden below lg, collapsible to an icon rail. */
export function Sidebar() {
  const { collapsed, toggleCollapsed } = useLayout();

  return (
    <aside
      className={cn(
        'relative hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out lg:block',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarNav collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      {/* Edge collapse toggle — a small floating pill centered on the
          sidebar's right border, in addition to the footer row action,
          so it's reachable right where the eye expects a rail toggle on
          large screens (mirrors the pattern used by most desktop app
          shells with a collapsible side nav). */}
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground lg:flex"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
