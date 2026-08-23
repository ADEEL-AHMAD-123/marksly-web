import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Home, LayoutGrid, Wallet, LifeBuoy, MessageSquare, ArrowRight,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

// Every real public page on the site, offered as a way forward instead of
// a dead end — kept in sync with sitemap.ts's staticPages by hand since
// there are few enough of these that a shared constant would be overkill.
const DESTINATIONS = [
  { icon: LayoutGrid, title: 'Features', desc: 'Everything Marksly does, module by module.', href: '/features' },
  { icon: Wallet, title: 'Pricing', desc: 'Plans and what each one includes.', href: '/pricing' },
  { icon: LifeBuoy, title: 'Help Center', desc: 'Answers to common questions.', href: '/help' },
  { icon: MessageSquare, title: 'Contact', desc: 'Talk to a real person.', href: '/contact' },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-[0.07]"
          style={{ background: 'radial-gradient(50% 60% at 75% 0%, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div className="mx-auto max-w-2xl px-5 pb-8 pt-16 text-center sm:pt-20">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">This page doesn’t exist</h1>
          <span aria-hidden className="mx-auto mt-5 block h-1 w-14 rounded-full bg-accent" />
          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
            The link may be outdated, or the page may have moved. Here’s how to get back on track.
          </p>
          <Link href="/" className={`${buttonVariants({ size: 'lg' })} mt-8 w-full sm:w-auto`}>
            <Home aria-hidden size={18} /> Back to homepage
          </Link>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl px-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Or go straight to
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DESTINATIONS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md sm:p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <d.icon aria-hidden size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{d.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{d.desc}</p>
                </div>
                <ArrowRight
                  aria-hidden
                  size={16}
                  className="mt-1 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
