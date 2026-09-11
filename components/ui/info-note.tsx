'use client';

import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';

interface InfoNoteLink {
  href: string;
  label: string;
}

/**
 * A quiet, always-available reference note for explaining something
 * non-obvious about the page it sits on — "how does this person actually log
 * in", "why can't I get a card yet", "what is this page for". Uses a native
 * <details> (no JS state, no dismiss-tracking) so it stays collapsed by
 * default and never nags — just there when needed.
 *
 * This is the ONE shared component for this "quiet explainer" pattern used
 * across the app — every page-level explainer should render through this,
 * not a one-off styled <div>, so they all look and behave identically no
 * matter which page they're on.
 *
 * `title` is required (no generic default) on purpose: this component was
 * previously called LoginInfoNote with a "How do they log in?" default, and
 * a page (Email Log) that never overrode it ended up silently showing a
 * title that had nothing to do with what the page actually does. Forcing
 * every call site to supply its own title makes that class of mistake
 * impossible to repeat.
 */
export function InfoNote({
  children,
  title,
  link,
}: {
  children: React.ReactNode;
  /** The summary heading — must be specific to this page/section, e.g. "How
   *  do they log in?" or "What is this page for?". No default on purpose. */
  title: string;
  /** Optional "fix it here" / "learn more" link at the bottom of the
   *  expanded note — e.g. the ID Cards note explaining a missing field can
   *  point straight at the Students page instead of just telling the admin
   *  where to go in text. */
  link?: InfoNoteLink;
}) {
  return (
    <details className="group rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm open:border-primary/30 open:bg-primary-soft/40 open:pb-3.5 open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground marker:content-none">
        <Info size={15} className="shrink-0 text-primary" />
        <span className="font-semibold text-foreground">{title}</span>
        <span className="ml-auto text-xs font-medium text-primary group-open:hidden">Show answer</span>
        <span className="ml-auto hidden text-xs font-medium text-primary group-open:inline">Hide</span>
      </summary>
      {/* Answer text bumped from text-xs/muted-foreground to text-sm on the
          near-full-contrast foreground/90 — the previous combination was
          hard to read at a glance, especially against the (also muted)
          bg-card/60 panel background. A thin left border under the icon
          column gives the answer a clear "this is the content" visual
          anchor separate from the clickable summary line above it. */}
      <div className="mt-2.5 space-y-1.5 border-l-2 border-primary/25 pl-[19px] text-sm leading-relaxed text-foreground/90">
        {children}
        {link && (
          <Link
            href={link.href}
            className="!mt-3 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {link.label} <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </details>
  );
}
