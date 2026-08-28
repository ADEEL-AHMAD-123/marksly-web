import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarClock, Wallet, FileText, Users2, BarChart2,
  ArrowRight, Check, ShieldCheck, Building2, MessageSquare,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'College Management System in Pakistan — Marksly';
const DESCRIPTION =
  'Marksly is a college and campus management system for Pakistan — multi-section timetables, fee collection, exams and results, and department-wide reporting in one platform.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/college-management-system-pakistan' },
  openGraph: { type: 'website', url: '/college-management-system-pakistan', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'College Management System Pakistan', item: 'https://marksly.pk/college-management-system-pakistan' },
  ],
};

const MODULES = [
  { icon: CalendarClock, title: 'Timetable & sections', desc: 'Build weekly schedules per class and section — every teacher sees exactly what they teach, with no clashing periods.' },
  { icon: FileText, title: 'Exams & results', desc: 'Marks entry on a fast grid, grades calculated automatically, results published straight to students.' },
  { icon: Wallet, title: 'Fee collection', desc: 'Fee structures, discounts, and dues tracked automatically — JazzCash, EasyPaisa, bank transfer and challans supported.' },
  { icon: Users2, title: 'Multi-section & multi-campus', desc: 'Manage several classes, sections or campuses from one login, with role-based access for every staff member.' },
  { icon: BarChart2, title: 'Reports', desc: 'Live dashboards across attendance, fees and results — know your numbers without asking anyone.' },
  { icon: MessageSquare, title: 'Communication', desc: 'Notices, fee reminders and attendance alerts sent to students and parents by WhatsApp or SMS.' },
];

const WHY_PAKISTAN = [
  'Handles the scale of a college — hundreds of students across multiple sections and departments',
  'Local payment methods your students already use: JazzCash, EasyPaisa, bank transfer and challans',
  'WhatsApp and SMS communication — no separate app required for students or parents',
  'PKR pricing, with a free plan to trial before committing',
  'Role-based access for admins, department heads, teachers and accountants',
];

const FAQ = [
  { q: 'What is a college management system?', a: 'A college management system is software that manages admissions, timetable, exams, fees, and communication for a college or campus in one platform, replacing manual registers and disconnected spreadsheets.' },
  { q: 'Can Marksly handle multiple sections or campuses?', a: 'Yes — Marksly is built for multi-section institutions, letting admins manage several classes, sections or campuses from a single login with role-based access per staff member.' },
  { q: 'Does Marksly support local payment methods?', a: 'Yes — fee collection supports JazzCash, EasyPaisa, bank transfer and challans, alongside PKR-based pricing for the platform itself.' },
  { q: 'Is there a free plan to try it first?', a: 'Yes — Marksly offers a free plan for up to 50 students with no card required, so you can trial it before upgrading.' },
  { q: 'How is this different from a school management system?', a: 'The same platform covers both — Marksly works as a school, college, or university management system depending on how you configure classes, sections and departments.' },
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

export default function CollegeManagementSystemPakistanPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <MarketingHeader />

      <PageHero
        eyebrow="For colleges in Pakistan"
        title="A college management system built to scale"
        description="Timetable, exams, fees, and department-wide reporting — one platform for every section and campus, with local payments built in."
      />

      <section className="pb-14 sm:pb-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div key={m.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <m.icon aria-hidden size={18} />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{m.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-sidebar py-14 text-sidebar-foreground sm:py-20">
        <div className="relative mx-auto max-w-4xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Built for Pakistan</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Why colleges in Pakistan choose Marksly</h2>
          </div>
          <ul className="mx-auto mt-8 max-w-xl space-y-3">
            {WHY_PAKISTAN.map((w) => (
              <li key={w} className="flex items-start gap-2.5 text-sm text-sidebar-muted">
                <Check aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pb-14 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Common questions</h2>
          </div>
          <div className="mt-8 divide-y divide-border">
            {FAQ.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-border bg-background py-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
        />
        <div className="relative mx-auto max-w-2xl px-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">See it in action</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Set up your college on Marksly today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Free for up to 50 students, no card required. See timetable, exams, fees and reporting connected from day one.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)] sm:w-auto`}
            >
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/features" className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2 sm:w-auto`}>
              <Building2 aria-hidden size={16} />
              See all features
            </Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden size={14} className="text-accent" /> Each institution&apos;s data is isolated and role-protected.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
