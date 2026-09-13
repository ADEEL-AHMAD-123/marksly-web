import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, MapPin, Target, Users, Wallet, MessageSquare, ShieldCheck,
  Sparkles, Clock, Layers, HeartHandshake, Quote, ChevronDown,
} from 'lucide-react';
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
    founder: { '@id': 'https://marksly.pk/about#founder' },
    foundingLocation: { '@type': 'Country', name: 'Pakistan' },
  },
};

// Standalone Person entity for the founder — a stable @id (referenced from
// both here and Organization.founder in HomeJsonLd.tsx) so this reads as
// one addressable entity across the whole site's graph, not a fresh,
// unlinked blob every time the founder is mentioned. AI answer engines and
// Google's Knowledge Graph both rely on this kind of entity resolution when
// deciding whether "who founded Marksly" and "who is Adeel Ahmad
// Akhunzada" are asking about the same thing.
const PERSON_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': 'https://marksly.pk/about#founder',
  name: 'Adeel Ahmad Akhunzada',
  jobTitle: 'Founder',
  nationality: { '@type': 'Country', name: 'Pakistan' },
  worksFor: { '@id': 'https://marksly.pk/#organization' },
  url: 'https://marksly.pk/about',
};

// FAQPage structured data — matches the visible "Common questions" section
// below 1:1 (same rule enforced everywhere else on this site: never list a
// question here that isn't actually rendered on the page). Written
// specifically to answer the exact questions someone would type into
// Google, ChatGPT or Gemini about who's behind Marksly — self-contained
// answers that don't depend on the rest of the page for context, since
// that's what an AI answer engine actually lifts.
const FAQ = [
  { q: 'Who founded Marksly?', a: 'Marksly was founded by Adeel Ahmad Akhunzada, based in Pakistan. He remains directly involved and reachable — institutions using Marksly can contact him, not just a support tier.' },
  { q: 'Who is Adeel Ahmad Akhunzada?', a: 'Adeel Ahmad Akhunzada is the founder of Marksly (marksly.pk), a Pakistan-based school and campus management platform for academies, schools, colleges and universities.' },
  { q: 'What is Marksly?', a: 'Marksly is a Pakistan-based school and campus management platform covering attendance, exams, fees, timetable, a parent & student portal, notices and ID cards in one connected system, built for how institutions in Pakistan actually run.' },
  { q: 'Where is Marksly based?', a: 'Marksly is based in Pakistan and built specifically around Pakistani institutions — local payment methods, WhatsApp/SMS messaging, and pricing in PKR.' },
  { q: 'Is Marksly affiliated with any other similarly-named product?', a: 'No. Marksly (marksly.pk) is a distinct, Pakistan-based product and company, unaffiliated with any other similarly-named school-management software, including one operating at marksly.in in India.' },
];

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

// "At a glance" strip — every value here is a real, verifiable fact stated
// elsewhere on the site (HomeHero's stat bar, the free-plan pricing tier,
// HomeJsonLd.tsx's contactPoint hoursAvailable) restated here for scanners
// who land on /about first, not new claims invented for this page.
const AT_A_GLANCE = [
  { icon: MapPin, label: 'Based in Pakistan', sub: 'Built for local institutions, not adapted from one' },
  { icon: Sparkles, label: 'Free up to 50 students', sub: 'No card required to start' },
  { icon: Clock, label: 'Support 8am – 11pm', sub: 'Every day of the week, by WhatsApp or email' },
  { icon: HeartHandshake, label: 'Founder-led', sub: 'One person still directly reachable, not a support tier' },
];

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
    icon: Wallet,
    title: 'Pricing you can see, in your currency',
    desc: 'Plans are published in PKR on the pricing page itself — no "contact sales to find out what this costs" for a normal-sized institution.',
  },
  {
    icon: Layers,
    title: 'Actively maintained, not left to drift',
    desc: 'Marksly keeps getting reviewed and refined module by module — new capability, tightened permissions, clearer error messages — rather than shipped once and left alone.',
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
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <MarketingHeader />

      <PageHero
        eyebrow="About Marksly"
        title="Software built by someone who actually looked at the problem"
        description="A school and campus management platform built in and for Pakistan — not a global product with a translation bolted on."
      />

      {/* ── At a glance — same inline-stat pattern as HomeHero, so a visitor
           who lands here first gets the same quick credibility signals ──── */}
      <section className="pb-2 sm:pb-4">
        <div className="mx-auto max-w-4xl px-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {AT_A_GLANCE.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center sm:p-5">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <s.icon aria-hidden size={17} />
                </span>
                <p className="mt-2.5 text-sm font-bold leading-snug">{s.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder + origin story — the real substance of the page,
           broken into scannable sub-sections rather than one dense block ── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Our story</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Why Marksly exists</h2>
          </div>

          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-lg font-bold tracking-tight">The problem</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground/90 sm:text-base">
                Marksly was started by Adeel Ahmad Akhunzada in Pakistan, out of a simple observation:
                most academies, schools, colleges and universities here were still running on paper
                registers, scattered spreadsheets and a patchwork of WhatsApp groups — not because
                better software didn’t exist, but because most of what did exist wasn’t actually built
                around how institutions in Pakistan operate. Fee collection assumed a foreign card,
                parent communication assumed an app nobody would install, and pricing assumed a
                currency and a budget that didn’t match a typical local academy.
              </p>
            </div>

            <div className="relative rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-7">
              <Quote aria-hidden size={22} className="text-accent/40" />
              <p className="mt-3 text-base font-medium leading-relaxed text-foreground sm:text-lg">
                The idea behind Marksly, from day one: institutions here don’t need a smaller version
                of software built for somewhere else — they need something built for how they run, from
                the first line of code.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">The founding principle behind Marksly</p>
            </div>

            <div>
              <h3 className="text-lg font-bold tracking-tight">The approach</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground/90 sm:text-base">
                Marksly is the answer to that gap: one connected system covering attendance, exams and
                custom grading schemes, fees and invoices, timetable, subjects and teacher assignment, a
                parent &amp; student portal, notices and holidays, digital ID cards, and staff management —
                all talking to each other instead of living in separate tools that never sync. WhatsApp
                and PKR pricing are built in from the start, not added on later as an afterthought. Every
                institution that signs up runs in its own fully isolated space, with role-based access so
                a teacher, an accountant and an admin each see exactly what their job needs and nothing
                more.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
                That same principle — build it around the real workflow, not a generic template — is why
                Marksly keeps expanding module by module: a parent portal so families stop calling the
                office for a result or a due date, a notices system that posts holidays automatically, a
                promotion tool so year-end doesn’t mean re-entering an entire class by hand. None of it
                is theoretical; it’s built in response to what an institution actually needs next.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold tracking-tight">Where it’s headed</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground/90 sm:text-base">
                Marksly is still directly founder-led — every institution using it can reach Adeel
                directly, not just a support tier. That’s deliberate: a product built for how Pakistani
                institutions actually work stays that way by staying close to the people running them,
                not by scaling support away from a founder who still answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What we believe / how we build ──────────────────────────────── */}
      <section className="border-t border-border bg-card/40 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">What we believe</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">How Marksly is built</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
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

      {/* ── Common questions — plain, self-contained answers to exactly what
           someone would type into Google/ChatGPT/Gemini about who's behind
           Marksly; matches FAQ_JSON_LD above 1:1 ─────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-2xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Common questions</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">About Marksly, answered directly</h2>
          </div>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:content-none sm:text-base">
                  {item.q}
                  <ChevronDown aria-hidden size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
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
          <p className="mt-6 text-xs text-sidebar-muted">
            Prefer to talk first?{' '}
            <Link href="/contact" className="font-medium text-accent hover:underline">Contact us</Link>{' '}
            or read what{' '}
            <Link href="/testimonials" className="font-medium text-accent hover:underline">schools already running Marksly</Link>{' '}
            have to say.
          </p>
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
