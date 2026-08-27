'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Register has roughly 3x as many fields as every other auth page (login,
 *  forgot-password, reset, verify-email) — keeping all auth pages on the
 *  same `max-w-md` card made register unnecessarily tall (paired with the
 *  layout's independent-scroll fix, that meant a lot of scrolling just to
 *  reach "Create account"). Widening only the register card and laying its
 *  fields out two-per-row (see RegisterView) trades that extra height for
 *  width instead, without touching the simpler single-column pages, which
 *  still look right at the narrower, more input-appropriate `max-w-md`. */
export function AuthCardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = pathname === '/register';

  return (
    <div className={cn('w-full animate-fade-in', wide ? 'max-w-2xl' : 'max-w-md')}>
      {children}
    </div>
  );
}
