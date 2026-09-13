'use client';

import { useMemo, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { HelpTopic } from '@/lib/help-topics';

/**
 * Client-side search over the Help Center's Q&As. Deliberately client-only
 * and additive — the server-rendered page still renders every question via
 * HELP_TOPICS for SEO/structured data regardless of what a visitor types
 * here; this only narrows what's *visible* in the browser afterward, it
 * never removes anything from the initial HTML or the FAQPage JSON-LD.
 */
export function HelpFaqSearch({ topics }: { topics: HelpTopic[] }) {
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return topics;
    return topics
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.q.toLowerCase().includes(normalized) || item.a.toLowerCase().includes(normalized)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [topics, normalized]);

  const totalMatches = filtered.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <>
      {/* Search box */}
      <div className="mx-auto max-w-xl px-5">
        <div className="relative">
          <Search aria-hidden size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles — e.g. “fees”, “portal”, “attendance”"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-10 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
            aria-label="Search the Help Center"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X aria-hidden size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick jump — hidden while actively searching, since the categories
          below are already filtered down to what matched */}
      {!normalized && (
        <div className="mx-auto max-w-3xl px-5">
          <nav aria-label="Jump to topic" className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center">
            {topics.map((t) => (
              <a
                key={t.slug}
                href={`#${t.slug}`}
                className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-accent hover:text-accent"
              >
                {t.category}
              </a>
            ))}
          </nav>
        </div>
      )}

      <section className="pb-14 pt-6 sm:pb-20 sm:pt-8">
        <div className="mx-auto max-w-3xl space-y-10 px-5 sm:space-y-12">
          {normalized && (
            <p role="status" className="text-center text-sm text-muted-foreground">
              {totalMatches > 0
                ? `${totalMatches} result${totalMatches === 1 ? '' : 's'} for “${query}”`
                : `No results for “${query}” — try a different word, or contact us below.`}
            </p>
          )}

          {filtered.map((section) => (
            <div key={section.category} id={section.slug} className="scroll-mt-20 sm:scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <section.icon aria-hidden size={16} />
                </span>
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">{section.category}</h2>
              </div>
              <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm sm:mt-4">
                {section.items.map((item) => (
                  <details key={item.q} className="group p-4 sm:p-5" open={!!normalized}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:content-none sm:text-base">
                      {item.q}
                      <ChevronDown aria-hidden size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
