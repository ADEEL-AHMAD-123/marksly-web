'use client';

import { Info } from 'lucide-react';

/**
 * A quiet, always-available reference for "how does this person actually
 * log in" — shown on the Students/Teachers/Staff list pages themselves (not
 * just once, buried inside the add-form), since that's the moment an admin
 * is most likely to be fielding a "my kid/teacher can't log in" question and
 * needs the answer without having to go dig through a form they filled out
 * weeks ago. Uses a native <details> (no JS state, no dismiss-tracking) so
 * it stays collapsed by default and never nags — just there when needed.
 */
export function LoginInfoNote({ children }: { children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm open:pb-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground marker:content-none">
        <Info size={15} className="shrink-0 text-primary" />
        <span className="font-medium text-foreground">How do they log in?</span>
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="mt-2 space-y-1 pl-[23px] text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
