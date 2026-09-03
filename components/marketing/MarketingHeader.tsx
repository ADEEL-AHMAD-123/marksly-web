'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/help', label: 'Help' },
  { href: '/blog', label: 'Blog' },
  { href: '/testimonials', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
] as const;

export function MarketingHeader({ active }: { active?: (typeof NAV_ITEMS)[number]['href'] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300',
        scrolled
          ? 'border-b border-border bg-background/90 shadow-[0_1px_0_0_rgba(0,0,0,0.03),0_8px_24px_-16px_rgba(0,0,0,0.25)] backdrop-blur-xl'
          : 'border-b border-transparent bg-background/60 backdrop-blur-sm'
      )}
    >
      {/* Tapered gold rule — fades at the edges instead of a flat block, reads more like a finish than a bar */}
      <div
        aria-hidden
        className="h-[2.5px] w-full"
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
      />

      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between px-5 transition-[height] duration-300',
          scrolled ? 'h-16' : 'h-20'
        )}
      >
        <Link href="/" onClick={() => setOpen(false)} className="shrink-0">
          <Logo size={scrolled ? 28 : 31} className="transition-all duration-300" />
        </Link>

        <nav className="hidden items-center gap-8 text-[13.5px] font-semibold tracking-wide text-foreground/85 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative py-1.5 transition-colors hover:text-foreground',
                active === item.href && 'text-foreground'
              )}
            >
              {item.label}
              {/* animated underline: full width when active, grows from center on hover otherwise */}
              <span
                aria-hidden
                className={cn(
                  'absolute -bottom-0.5 left-0 right-0 h-[1.5px] origin-center scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100',
                  active === item.href && 'scale-x-100'
                )}
              />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <span aria-hidden className="h-5 w-px bg-border" />
          <Link href="/login" className="text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: 'sm' }), 'group gap-1.5 shadow-sm transition-shadow hover:shadow-md')}
          >
            Start free
            <ArrowRight aria-hidden size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile menu toggle — the nav above is hidden below md, this is its only way in */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <nav id="mobile-nav" className="border-t border-border bg-background px-5 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block border-b border-border py-3 text-base font-medium text-foreground',
                    active === item.href && 'text-primary'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className={`${buttonVariants({ variant: 'secondary' })} w-full`}>
              Sign in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className={`${buttonVariants()} w-full`}>
              Start free
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
