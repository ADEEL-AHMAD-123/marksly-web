import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap, CalendarCheck, Wallet, FileText, CalendarClock,
  CreditCard, MessageSquare, ArrowRight, Activity, Check, ShieldCheck, Zap, Globe2,
  Lock, Database, Headphones, Download, Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { GrowthPlanCard } from '@/components/marketing/GrowthPlanCard';

export const metadata: Metadata = {
  title: 'Marksly — School & Campus Management Software',
  description:
    'Marksly is an all-in-one management system for academies, schools, colleges and universities — students, attendance, fees, exams, timetable, ID cards and parent messaging in one place.',
  alternates: { canonical: '/' },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://marksly.pk/#organization',
      name: 'Marksly',
      url: 'https://marksly.pk',
      logo: 'https://marksly.pk/logo-full.svg',
      email: 'support@marksly.pk',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Marksly',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'All-in-one school and campus management software for academies, schools, colleges and universities — students, attendance, fees, exams, timetable, ID cards and parent messaging.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR', description: 'Free plan for up to 50 students' },
      url: 'https://marksly.pk',
    },
  ],
};

const SCHOOLS = [
  { name: 'Al-Noor Scholars Academy', urdu: 'النور اسکالرز اکیڈمی', logo: '/logos/al-noor-scholars-academy.png' },
  { name: 'Quaid-e-Azam Future School', urdu: 'قائد اعظم فیوچر اسکول', logo: '/logos/quaid-e-azam-future-school.png' },
  { name: 'Pak Crescent School System', urdu: 'پاک کریسنٹ اسکول سسٹم', logo: '/logos/pak-crescent-school-system.png' },
  { name: 'The Knowledge Gate School', logo: '/logos/the-knowledge-gate-school.png' },
  { name: 'Iqbal Heights School', urdu: 'اقبال ہائٹس اسکول', logo: '/logos/iqbal-heights-school.png' },
  { name: 'National Scholars Academy', urdu: 'نیشنل اسکالرز اکیڈمی', logo: '/logos/national-scholars-academy.png' },
  { name: 'Roshan Taleem School', logo: '/logos/roshan-taleem-school.png' },
  { name: 'Unity Grammar School', logo: '/logos/unity-grammar-school.png' },
  { name: 'Green Valley Scholars School', logo: '/logos/green-valley-scholars-school.png' },
  { name: 'The Learning House Pakistan', logo: '/logos/the-learning-house-pakistan.png' },
];

const COLLEGES = [
  { name: 'Crescent College of Excellence', urdu: 'کریسنٹ کالج آف ایکسیلنس', logo: '/logos/crescent-college-of-excellence.png' },
  { name: 'National Institute of Modern Studies', urdu: 'نیشنل انسٹی ٹیوٹ آف ماڈرن اسٹڈیز', logo: '/logos/national-institute-of-modern-studies.png' },
  { name: 'Quaid Scholars College', urdu: 'قائد اسکالرز کالج', logo: '/logos/quaid-scholars-college.png' },
  { name: 'Pakistan College of Advanced Learning', logo: '/logos/pakistan-college-of-advanced-learning.png' },
  { name: 'Iqbal Institute of Higher Education', logo: '/logos/iqbal-institute-of-higher-education.png' },
  { name: 'Horizon College Islamabad', logo: '/logos/horizon-college-islamabad.png' },
  { name: 'Al-Falah College of Studies', logo: '/logos/al-falah-college-of-studies.png' },
  { name: 'Future Minds College', logo: '/logos/future-minds-college.png' },
  { name: 'Capital Scholars College', logo: '/logos/capital-scholars-college.png' },
  { name: 'The Excellence College Pakistan', logo: '/logos/the-excellence-college-pakistan.png' },
];

const DIFFERENTIATORS = [
  { n: '01', icon: Globe2, title: 'Built for how schools actually run', desc: 'Local payment rails and WhatsApp/SMS built in — not a global template with a translation bolted on.' },
  { n: '02', icon: Zap, title: 'Set up in minutes, not weeks', desc: 'No implementation team, no onboarding calls required. Create your institution and start using it today.' },
  { n: '03', icon: ShieldCheck, title: 'Your data, isolated and safe', desc: 'Every institution runs in its own isolated space, with role-based access controlling exactly who sees what.' },
];

type Institution = { name: string; urdu?: string; logo: string };

function MarqueeRow({ items, direction }: { items: Institution[]; direction: 'left' | 'right' }) {
  const track = [...items, ...items]; // duplicated for seamless loop
  return (
    <div className="marquee-track relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[hsl(36,26%,92%)] to-transparent sm:w-28" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[hsl(36,26%,92%)] to-transparent sm:w-28" />
      <div className={`flex w-max items-center gap-6 sm:gap-12 ${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}`}>
        {track.map((inst, i) => {
          const isDuplicate = i >= items.length; // second half exists only for the seamless loop
          return (
            <div key={`${inst.name}-${i}`} aria-hidden={isDuplicate} className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inst.logo}
                alt={isDuplicate ? '' : inst.name}
                width={52}
                height={52}
                className="h-9 w-9 shrink-0 rounded-full shadow-sm sm:h-[52px] sm:w-[52px]"
              />
              <p className="whitespace-nowrap text-xs font-semibold leading-none text-foreground sm:text-sm">{inst.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <MarketingHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* one deliberate background treatment, not a blob per section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] opacity-[0.08]"
          style={{ background: 'radial-gradient(60% 50% at 80% 0%, hsl(var(--primary)) 0%, transparent 70%), radial-gradient(40% 40% at 5% 15%, hsl(var(--accent)) 0%, transparent 70%)' }}
        />

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-16 pt-16 md:pb-24 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Marksly for schools & colleges
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.05] md:text-6xl">
              The operating system<br className="hidden sm:block" /> for your <span className="text-primary">institution</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              Students, attendance, fees, exams, timetable, ID cards and parent messaging —
              one connected system, so your team spends less time on paperwork.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link href="/register" className={`${buttonVariants({ size: 'lg' })} w-full sm:w-auto`}>
                Start free trial <ArrowRight aria-hidden size={18} />
              </Link>
              <Link href="/pricing" className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} w-full sm:w-auto`}>
                View pricing
              </Link>
            </div>

            {/* Inline stat bar — grid on mobile (no orphaned dividers when wrapping), dividers only once there's room to sit in one row */}
            <div className="mt-10 grid grid-cols-3 gap-x-3 gap-y-4 sm:mt-12 sm:flex sm:flex-wrap sm:items-start sm:gap-x-8">
              {[
                { value: 'Free', label: 'up to 50 students' },
                { value: '<10 min', label: 'to get started' },
                { value: '24/7', label: 'access, from any device' },
              ].map((s, i) => (
                <div key={s.label} className={i > 0 ? 'sm:border-l sm:border-border sm:pl-8' : ''}>
                  <p className="text-lg font-bold text-primary sm:text-xl">{s.value}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: product visual — a cleaner, more genuine-feeling dashboard preview */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between border-b border-border bg-muted/60 px-5 py-2.5">
                <span className="rounded-md bg-card px-3 py-1 text-[11px] text-muted-foreground">app.marksly.pk</span>
                <span className="text-[11px] text-muted-foreground">Dashboard</span>
              </div>
              <div className="flex bg-background">
                <div className="hidden w-14 flex-col items-center gap-5 bg-sidebar py-6 sm:flex">
                  <span className="h-6 w-6 rounded-md bg-accent" />
                  {[GraduationCap, CalendarCheck, Wallet, FileText, MessageSquare].map((Icon, i) => (
                    <Icon key={i} aria-hidden size={16} className={i === 0 ? 'text-accent' : 'text-sidebar-muted'} />
                  ))}
                </div>
                <div className="flex-1 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Students', value: '1,248', icon: GraduationCap },
                      { label: 'Attendance', value: '96%', icon: CalendarCheck },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-card p-3.5">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <s.icon aria-hidden size={14} />
                        </span>
                        <p className="mt-2 text-xl font-bold">{s.value}</p>
                        <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* recent activity feed — feels like a real product, not a stat-tile cliché */}
                  <div className="mt-3 rounded-xl border border-border bg-card p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <Activity aria-hidden size={12} /> Recent activity
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {[
                        'Fee reminder sent to Grade 6 parents',
                        'Attendance submitted — Section B',
                        'Result published — Mid-term exam',
                      ].map((line) => (
                        <div key={line} className="flex items-center gap-2 text-[12px]">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                            <Check aria-hidden size={10} />
                          </span>
                          <span className="text-foreground/80">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* floating accent chip — small, deliberate depth cue */}
            <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-accent/30 bg-card px-4 py-3 shadow-lg sm:block">
              <p className="text-[11px] text-muted-foreground">Time saved weekly</p>
              <p className="text-lg font-bold text-accent">6+ hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Differentiator strip — real cards with a headline, not a bare
           numbered text row ──────────────────────────────────────────── */}
      <section className="border-y border-border bg-accent/10">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Why Marksly</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Built differently, on purpose</h2>
          </div>

          {/* connected roadmap — numbered nodes linked by a line, read left-to-right
              as a sequence rather than three unrelated cards */}
          <div className="relative mt-12 sm:mt-16">
            <div aria-hidden className="absolute left-[22px] top-3 bottom-3 w-px bg-primary/15 md:left-0 md:right-0 md:top-[22px] md:bottom-auto md:h-px md:w-auto" />

            <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {DIFFERENTIATORS.map((d) => (
                <div key={d.n} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
                    {d.n}
                  </div>
                  <div className="pt-1 md:pt-0">
                    <h3 className="text-lg font-semibold md:mt-5">{d.title}</h3>
                    <p className="mt-1.5 max-w-[240px] text-sm leading-relaxed text-muted-foreground md:mx-auto">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features: bento grid ─────────────────────────────────────── */}
      <section className="py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">What&apos;s inside</p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Everything your institution needs</h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              One connected system — no more juggling registers, spreadsheets and WhatsApp groups.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
            {/* Hero card — attendance, the daily-use core of the system,
                not a billing feature */}
            <div className="relative col-span-2 overflow-hidden rounded-2xl border border-border bg-sidebar p-5 text-sidebar-foreground sm:p-6 md:col-span-4 md:row-span-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <CalendarCheck aria-hidden size={20} />
                </span>
                <h3 className="text-lg font-bold sm:text-xl">Attendance, made effortless</h3>
              </div>
              <p className="mt-3 max-w-md text-sm text-sidebar-muted">
                Teachers mark attendance in seconds from any device. Admins get live, class-wise
                rates instantly — no more chasing paper registers at the end of the day.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['One-tap marking', 'Daily reports', 'Absentee alerts', 'Class & section wise'].map((t) => (
                  <span key={t} className="rounded-full border border-sidebar-border bg-sidebar-accent/50 px-2.5 py-0.5 text-xs">{t}</span>
                ))}
              </div>
            </div>

            {[
              { icon: GraduationCap, title: 'Student records', desc: 'Admissions, profiles, classes and sections with bulk CSV import.' },
              { icon: CalendarClock, title: 'Timetable', desc: 'Weekly schedules per section, built and shared in minutes.' },
              { icon: Users, title: 'Teachers', desc: 'Staff profiles, class assignments, and workload at a glance.' },
              { icon: CreditCard, title: 'ID cards & reports', desc: 'Printable QR ID cards, plus live dashboards across every module.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-3.5 transition-shadow hover:shadow-md sm:p-5 md:col-span-2">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8">
                    <f.icon aria-hidden size={15} className="sm:hidden" />
                    <f.icon aria-hidden size={16} className="hidden sm:block" />
                  </span>
                  <h3 className="text-xs font-semibold sm:text-sm">{f.title}</h3>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">{f.desc}</p>
              </div>
            ))}

            {/* fifth "small" card — half-width on mobile so it pairs with Fees
                in one row; col-span-2 on desktop to complete the exact-fill
                row3 math (2 + 3×col-span-2 = 6 cols) */}
            <div className="rounded-2xl border border-border bg-card p-3.5 transition-shadow hover:shadow-md sm:p-5 md:col-span-2">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8">
                  <MessageSquare aria-hidden size={15} className="sm:hidden" />
                  <MessageSquare aria-hidden size={16} className="hidden sm:block" />
                </span>
                <h3 className="text-xs font-semibold sm:text-sm">WhatsApp &amp; SMS</h3>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">Attendance alerts and fee reminders, delivered where parents already are.</p>
            </div>

            {/* fees — pairs with WhatsApp above on mobile, still a full feature
                just no longer the flagship card */}
            <div className="order-1 rounded-2xl border border-border bg-card p-3.5 sm:p-5 md:order-none md:col-span-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8">
                  <Wallet aria-hidden size={15} className="sm:hidden" />
                  <Wallet aria-hidden size={16} className="hidden sm:block" />
                </span>
                <h3 className="text-xs font-semibold sm:text-sm">Fees &amp; billing</h3>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">Fee structures, monthly auto-billing, discounts, receipts and dues tracking.</p>
            </div>

            {/* second highlight — exams & results, the other core academic
                reason institutions adopt Marksly */}
            <div className="order-2 col-span-2 rounded-2xl border border-accent/30 bg-accent/10 p-4 sm:p-5 md:order-none md:col-span-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <FileText aria-hidden size={16} />
                </span>
                <h3 className="text-sm font-semibold">Exams &amp; results, simplified</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Fast marks entry on a grid, auto-calculated grades, and results published straight to students and parents.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-center sm:mt-4">
            <Link
              href="/features"
              className="group flex flex-col items-center gap-1.5 text-center transition-all sm:flex-row sm:gap-4 sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:px-6 sm:py-4 sm:shadow-sm sm:hover:border-accent sm:hover:shadow-md"
            >
              <span className="hidden text-sm font-semibold sm:block">
                That&apos;s just a taste <span className="font-normal text-muted-foreground">— see the full feature list</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold leading-none text-primary-foreground transition-transform group-hover:translate-x-0.5">
                <span className="leading-none">See all features</span>
                <ArrowRight aria-hidden size={14} className="shrink-0" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust — institutions using Marksly, as a marquee ─────────────── */}
      <section className="border-y border-border bg-[hsl(36,26%,92%)] pb-16 pt-20 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Trusted by real institutions</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Schools and colleges running on Marksly</h2>
        </div>

        <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
          <MarqueeRow items={SCHOOLS} direction="left" />
          <MarqueeRow items={COLLEGES} direction="right" />
        </div>

      </section>

      {/* ── Security & data — navy, opens the "trust + commit" zone that
           runs into pricing right below it ─────────────────────────────── */}
      <section className="hidden bg-sidebar py-14 text-sidebar-foreground sm:block">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 divide-y divide-sidebar-border overflow-hidden rounded-2xl border border-sidebar-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {[
              { icon: Database, title: 'Data, isolated', desc: 'Never mixed across institutions' },
              { icon: Lock, title: 'Secure by default', desc: 'Encrypted, role-based access' },
              { icon: Download, title: 'Data stays yours', desc: 'Export any time, no lock-in' },
              { icon: Headphones, title: 'Direct support', desc: 'Real replies, not a ticket queue' },
            ].map((t) => (
              <div key={t.title} className="flex items-center gap-3 bg-sidebar-accent/20 px-5 py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <t.icon aria-hidden size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{t.title}</p>
                  <p className="truncate text-xs text-sidebar-muted">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser — continues the navy zone; hairline seam above
           keeps it legible as its own section rather than a blurred merge ── */}
      <section className="border-t border-sidebar-border bg-sidebar py-14 text-sidebar-foreground sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 text-center sm:gap-10 lg:grid-cols-2 lg:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pricing</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Simple, fair pricing</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-sidebar-muted sm:text-base lg:mx-0">
              Free for up to 50 students, no card required. Upgrade to Growth as your institution
              grows, or talk to us about a custom plan for multiple campuses.
            </p>
            <Link href="/pricing" className={`${buttonVariants({ size: 'lg' })} mt-6 w-full !bg-accent !text-accent-foreground hover:!bg-accent/90 sm:mt-7 sm:w-auto`}>
              View pricing <ArrowRight aria-hidden size={18} />
            </Link>
          </div>
          <GrowthPlanCard />
        </div>
      </section>

      {/* ── CTA — light, deliberately breaking the dark run: security →
           pricing → footer are all navy, so this stays light as the
           breathing gap between them, not a fourth dark section ─────────── */}
      <section className="relative overflow-hidden border-y border-border bg-background py-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: 'hsl(var(--accent))' }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 text-center sm:gap-10 lg:grid-cols-[1.2fr_1fr] lg:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Join institutions already on Marksly</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Your institution, running on one system — starting today
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base lg:mx-0">
              Set up your students, classes, and fee structure in one sitting, and see attendance,
              results, and dues update live from day one.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-foreground sm:mt-7 sm:text-sm lg:justify-start">
              {['No card required', 'Setup in under 10 minutes', 'Cancel anytime'].map((r) => (
                <span key={r} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                  <Check aria-hidden size={14} className="shrink-0 text-accent" strokeWidth={3} />
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/register"
              className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)]`}
            >
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link
              href="/contact"
              className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2`}
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
