import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Cross-links the three keyword-targeted "solutions" landing pages to each
// other. Pure internal-linking/topical-clustering play: it tells Google
// these pages belong to the same cluster (helps generic-intent pages), and
// gives a real human a next click instead of a dead end at the bottom of
// the page.
const ALL_SOLUTIONS = [
  { href: '/school-management-system-pakistan', label: 'School Management System' },
  { href: '/college-management-system-pakistan', label: 'College Management System' },
  { href: '/education-management-system-pakistan', label: 'Education Management System' },
] as const;

// `current` is optional — omit it (e.g. from a page that isn't itself one
// of the three, like the buyer's-guide page) to link all three instead of
// excluding one.
export function RelatedSolutions({ current }: { current?: (typeof ALL_SOLUTIONS)[number]['href'] }) {
  const others = current ? ALL_SOLUTIONS.filter((s) => s.href !== current) : ALL_SOLUTIONS;
  return (
    <section className="border-t border-border bg-muted/40 py-12">
      <div className="mx-auto max-w-4xl px-5">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Related solutions
        </p>
        <div className={`mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 ${others.length === 3 ? 'lg:grid-cols-3' : ''}`}>
          {others.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {s.label}
              <ArrowRight aria-hidden size={15} className="shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
