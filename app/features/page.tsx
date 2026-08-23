import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap, CalendarCheck, Wallet, FileText, CalendarClock,
  CreditCard, MessageSquare, BarChart2, ShieldCheck, ArrowRight, Check,
  Settings, Users2, Bell, Headphones,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';
import { FeatureVisual, type VisualKind } from '@/components/marketing/FeatureVisual';

export const metadata: Metadata = {
  title: 'Features — Everything Your Institution Needs',
  description:
    'Explore Marksly’s features in detail: attendance, exams & results, timetable, fees & invoices, student records, parent messaging, ID cards, and live reports — built for schools, colleges and academies.',
  alternates: { canonical: '/features' },
};

// Every module gets the same documentation-style treatment: icon, title,
// description, capability bullets, and an illustrative visual — no tiering
// by "importance." Order still leads with the daily-use modules.
type Feature = {
  slug: string;
  icon: typeof CalendarCheck;
  title: string;
  desc: string;
  bullets: string[];
  visual: VisualKind;
  plan: 'Starter' | 'Growth';
};

// Plan mapping taken directly from /pricing's PLANS data — Starter covers
// students/attendance/classes, fees & invoices, and exams & results;
// Growth adds timetable, ID cards, messaging and reports.
const FEATURES: Feature[] = [
  {
    slug: 'attendance', icon: CalendarCheck, title: 'Attendance',
    desc: 'Teachers mark their own classes in seconds, from any device — admins see the institution-wide picture the moment it happens.',
    bullets: [
      'One-tap marking per class or section',
      'Live, class-wise attendance rates for admins',
      'Automatic absentee alerts sent to parents',
      'Daily and monthly attendance reports',
    ],
    visual: 'attendance', plan: 'Starter',
  },
  {
    slug: 'exams', icon: FileText, title: 'Exams & results',
    desc: 'Create exams, enter marks on a fast grid, and publish results straight to students and parents.',
    bullets: [
      'Marks entry on a fast, spreadsheet-style grid',
      'Grades calculated automatically from your scheme',
      'Results published directly to students and parents',
      'Full result history kept per student',
    ],
    visual: 'exams', plan: 'Starter',
  },
  {
    slug: 'timetable', icon: CalendarClock, title: 'Timetable',
    desc: 'Build weekly schedules per section in minutes — every teacher sees exactly what they’re teaching, and when.',
    bullets: [
      'Weekly schedules built per class and section',
      'Teachers see "Teaching now" on their dashboard, with a quick link to mark attendance',
      'Changes reflect instantly for every teacher',
      'No clashing periods across sections',
    ],
    visual: 'timetable', plan: 'Growth',
  },
  {
    slug: 'fees', icon: Wallet, title: 'Fees & invoices',
    desc: 'Fee structures, monthly billing, discounts and dues — tracked automatically, with receipts generated for you.',
    bullets: [
      'Fee structures with discounts and fines',
      'Monthly billing and automatic receipts',
      'Outstanding-dues view per class',
      'Full payment history per student',
    ],
    visual: 'fees', plan: 'Starter',
  },
  {
    slug: 'students', icon: GraduationCap, title: 'Student records',
    desc: 'Admissions, profiles, classes and sections — one record per student, not scattered across registers.',
    bullets: [
      'Bulk CSV import for existing rosters',
      'Auto-linked parent contacts',
      'Class and section history kept per student',
      'Searchable across the whole institution',
    ],
    visual: 'students', plan: 'Starter',
  },
  {
    slug: 'messaging', icon: MessageSquare, title: 'Parent messaging',
    desc: 'Attendance alerts, fee reminders and notices, sent via WhatsApp or SMS — where parents already are.',
    bullets: [
      'Attendance alerts and fee reminders',
      'Sent to a single class, a section, or the whole institution',
      'Full delivery log per message',
      'Sent automatically or on demand',
    ],
    visual: 'messaging', plan: 'Growth',
  },
  {
    slug: 'id-cards', icon: CreditCard, title: 'ID cards',
    desc: 'Printable student ID cards with a scannable QR code, generated class by class.',
    bullets: [
      'Generated class by class in bulk',
      'Scannable QR code per student',
      'Reprint anytime as students join',
      'Consistent design across the institution',
    ],
    visual: 'idcard', plan: 'Growth',
  },
  {
    slug: 'reports', icon: BarChart2, title: 'Reports',
    desc: 'Live dashboards across attendance, fees and results — know your numbers without asking anyone.',
    bullets: [
      'Attendance, fees and results in one view',
      'Updates live as data comes in',
      'Filterable by class and section',
      'Exportable for record-keeping',
    ],
    visual: 'reports', plan: 'Growth',
  },
];

const HOW_IT_WORKS = [
  { icon: Settings, title: 'Set up once', desc: 'Add your classes, sections and fee structure in one sitting.' },
  { icon: Users2, title: 'Staff use it daily', desc: 'Teachers mark attendance and enter marks from any device.' },
  { icon: Bell, title: 'Parents stay informed', desc: 'Alerts and results reach them automatically, no chasing needed.' },
];

const PAKISTAN = [
  { icon: Wallet, title: 'Local payments', desc: 'JazzCash, EasyPaisa, bank transfer and challans — the methods your families already use.' },
  { icon: MessageSquare, title: 'WhatsApp & SMS', desc: 'Reach every parent where they already are.' },
  { icon: Headphones, title: 'Real human support', desc: 'Reach a real person by WhatsApp or email — not a ticket queue.' },
  { icon: ShieldCheck, title: 'Secure & multi-tenant', desc: 'Each institution’s data is isolated and protected, with role-based access throughout.' },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader active="/features" />

      <PageHero
        eyebrow="Product"
        title="Everything your institution needs"
        description="One connected system — no more juggling registers, spreadsheets and WhatsApp groups."
      />

      {/* ── Quick jump — every module, same treatment ───────────────────── */}
      <div className="mx-auto max-w-6xl px-5">
        <nav aria-label="Jump to feature" className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center">
          {FEATURES.map((f) => (
            <a
              key={f.slug}
              href={`#${f.slug}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-accent hover:text-accent"
            >
              {f.title}
            </a>
          ))}
        </nav>
      </div>

      {/* ── How it fits together — desktop/tablet only; skipped on mobile to
           keep the page moving straight into the modules people came for ── */}
      <div className="mx-auto hidden max-w-5xl px-5 pt-14 sm:block">
        <div className="grid grid-cols-3 gap-5">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature documentation — every module, identical structure ──── */}
      <section className="pb-14 pt-8 sm:pb-20 sm:pt-10">
        <div className="mx-auto max-w-5xl divide-y divide-border px-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.slug}
              id={f.slug}
              className="scroll-mt-20 py-9 first:pt-0 sm:scroll-mt-24 sm:py-16"
            >
              <div className={`grid grid-cols-1 items-center gap-6 sm:gap-14 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent sm:h-11 sm:w-11">
                      <f.icon aria-hidden size={18} />
                    </span>
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-border bg-muted px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-2.5 sm:text-[10px]">
                      {f.plan === 'Starter' ? 'Included in Starter' : 'Included in Growth'}
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{f.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{f.desc}</p>
                  <ul className="mt-5 space-y-2.5">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm">
                        <Check aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <FeatureVisual kind={f.visual} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Made to fit how your institution already runs ────────────── */}
      <section className="relative overflow-hidden bg-sidebar py-14 text-sidebar-foreground sm:py-20">
        <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-1/3 bg-accent opacity-[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Made to fit</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Built around how you already work</h2>
            <p className="mt-3 text-sm text-sidebar-muted sm:text-base">The payment methods and channels your families actually use.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {PAKISTAN.map((f) => (
              <div key={f.title} className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-5">
                <f.icon className="text-accent" size={22} />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-sidebar-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — matches the homepage's closing pattern ────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-background py-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
        />
        <div className="relative mx-auto max-w-2xl px-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">See it in action</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Every module, running together from day one
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Create your account and see attendance, exams, fees, and messaging connected on one dashboard — no card required.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-foreground sm:mt-7 sm:text-sm">
            {['No card required', 'Setup in under 10 minutes', 'Cancel anytime'].map((r) => (
              <span key={r} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <Check aria-hidden size={14} className="shrink-0 text-accent" strokeWidth={3} />
                {r}
              </span>
            ))}
          </div>

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
