import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Target, Users, Wallet, MessageSquare, ShieldCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'About Marksly';
const DESCRIPTION =
  'Marksly is a Pakistan-based school and campus management platform founded by Adeel Ahmad Akhunzada, built for how academies, schools, colleges and universities in Pakistan actually run.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: { type: 'website', url: '/about', title: `${TITLE} | Marksly Pakistan`, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: `${TITLE} | Marksly Pakistan`, description: DESCRIPTION },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'About', item: 'https://marksly.pk/about' },
  ],
};

// AboutPage schema, linked back to the same Organization defined in
// HomeJsonLd.tsx's @graph (same @id, so Google/AI answer engines resolve
// this as the same entity rather than a second, unrelated one) and naming
// the real founder as a Person — a genuine E-E-A-T/trust signal this site
// didn't have anywhere before this page.
const ABOUT_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': 'https://marksly.pk/about#about-page',
  url: 'https://marksly.pk/about',
  name: TITLE,
  description: DESCRIPTION,
  isPartOf: { '@id': 'https://marksly.pk/#website' },
  about: {
    '@id': 'https://marksly.pk/#organization',
    '@type': 'Organization',
    name: 'Marksly',
    founder: {
      '@type': 'Person',
      name: 'Adeel Ahmad Akhunzada',
      jobTitle: 'Founder',
    },
    foundingLocation: { '@type': 'Country', name: 'Pakistan' },
  },
};

const VALUES = [
  {
    icon: MapPin,
    title: 'Built here, for here',
    desc: 'Local payment methods, WhatsApp and SMS, and PKR pricing aren’t add-ons bolted onto a global template — they’re first-class, because that’s how institutions in Pakistan actually operate day to day.',
  },
  {
    icon: Target,
    title: 'One connected system, not another silo',
    desc: 'Attendance, fees, exams, timetable and parent communication are built to work together from day one, so staff stop re-entering the same information across a register, a spreadsheet and a WhatsApp group.',
  },
  {
    icon: ShieldCheck,
    title: 'Every institution’s data, isolated',
    desc: 'Marksly is fully multi-tenant — one institution’s records are never mixed with another’s, and role-based access keeps every staff member scoped to exactly what their job needs.',
  },
  {
    icon: Users,
    title: 'Direct support, not a ticket queue',
    desc: 'Questions reach a real person by WhatsApp or email — not a support form that disappears into a queue.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_JSON_LD) }} />

      <MarketingHeader />

      <PageHero
        eyebrow="About"
        title="Why Marksly exists"
        description="A school and campus management platform built in and for Pakistan — not a global product with a translation bolted on."
      />

      {/* ── Founder + origin story ───────────────────────────────────────── */}
      <section className="pb-4 sm:pb-6">
        <div className="mx-auto max-w-2xl px-5">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Founder</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">Adeel Ahmad Akhunzada</h2>
            <p className="mt-1 text-sm text-muted-foreground">Founder, Marksly · Pakistan</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
              Marksly was started by Adeel Ahmad Akhunzada in Pakistan, out of a simple observation: most
              academies, schools, colleges and universities here were still running on paper registers,
              scattered spreadsheets and a patchwork of WhatsApp groups — not because better software
              didn’t exist, but because most of what existed wasn’t actually built around how institutions
              in Pakistan operate. Fee collection assumed a foreign card, parent communication assumed an
              app nobody would install, and pricing assumed a currency and a budget that didn’t match a
              typical local academy.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
              Marksly is the answer to that gap: one connected system for attendance, fees, exams,
              timetable and parent communication, with JazzCash, EasyPaisa, WhatsApp and PKR pricing
              built in from the start — not added on later as an afterthought.
            </p>
          </div>
        </div>
      </section>

      {/* ── What we believe / how we build ──────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">What we believe</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">How Marksly is built</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <v.icon aria-hidden size={18} />
                </span>
                <h3 className="mt-3 font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where we are ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-sidebar py-14 text-sidebar-foreground sm:py-20">
        <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-1/3 bg-accent opacity-[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Based in Pakistan</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Reach a real person, directly</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-sidebar-muted sm:text-base">
            Whether you’re evaluating Marksly for your institution or already running it, questions go to a
            real person — not a ticket queue.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-5 text-left">
              <Wallet aria-hidden size={20} className="text-accent" />
              <h3 className="mt-3 font-semibold">Sales &amp; pricing</h3>
              <p className="mt-1.5 text-sm text-sidebar-muted">
                <a href="mailto:support@marksly.pk" className="hover:underline">support@marksly.pk</a>
              </p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-5 text-left">
              <MessageSquare aria-hidden size={20} className="text-accent" />
              <h3 className="mt-3 font-semibold">WhatsApp</h3>
              <p className="mt-1.5 text-sm text-sidebar-muted">
                <a href="https://wa.me/923175496466" className="hover:underline">+92 317 5496466</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-background py-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
        />
        <div className="relative mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">See it running for yourself</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Create your account and try Marksly with your own classes, fees and exams — no card required.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)] sm:w-auto`}
            >
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link
              href="/contact"
              className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2 sm:w-auto`}
            >
              <MessageSquare aria-hidden size={16} />
              Talk to us first
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
