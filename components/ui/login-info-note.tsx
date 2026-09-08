'use client';

import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';

interface LoginInfoNoteLink {
  href: string;
  label: string;
}

/**
 * A quiet, always-available reference for "how does this person actually
 * log in" — shown on the Students/Teachers/Staff list pages themselves (not
 * just once, buried inside the add-form), since that's the moment an admin
 * is most likely to be fielding a "my kid/teacher can't log in" question and
 * needs the answer without having to go dig through a form they filled out
 * weeks ago. Uses a native <details> (no JS state, no dismiss-tracking) so
 * it stays collapsed by default and never nags — just there when needed.
 *
 * This is the ONE shared component for this "quiet explainer" pattern —
 * every "how do they log in" / "why can't I get a card yet" style note
 * across the app should render through this, not a one-off styled <div>,
 * so they all look and behave identically no matter which page they're on.
 */
export function LoginInfoNote({
  children,
  title = 'How do they log in?',
  link,
}: {
  children: React.ReactNode;
  /** Override the summary text — this component started as login-specific
   *  but the collapsible/quiet-reference pattern is generic (see the ID
   *  Cards page's "why can't I get a card yet?" note), so any caller can
   *  reuse it with its own heading instead of a separate near-duplicate
   *  component. */
  title?: string;
  /** Optional "fix it here" link at the bottom of the expanded note — e.g.
   *  the ID Cards note explaining a missing field can point straight at the
   *  Students page instead of just telling the admin where to go in text. */
  link?: LoginInfoNoteLink;
}) {
  return (
    <details className="group rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm open:pb-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground marker:content-none">
        <Info size={15} className="shrink-0 text-primary" />
        <span className="font-medium text-foreground">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="mt-2 space-y-1 pl-[23px] text-xs leading-relaxed text-muted-foreground">
        {children}
        {link && (
          <Link
            href={link.href}
            className="!mt-2.5 inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {link.label} <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </details>
  );
}
