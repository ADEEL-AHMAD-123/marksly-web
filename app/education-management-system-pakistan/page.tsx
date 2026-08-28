import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Layers, Wallet, FileText, ShieldCheck, BarChart2,
  ArrowRight, Check, Network, MessageSquare,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'Education Management System in Pakistan — Marksly';
const DESCRIPTION =
  'Marksly is an education management system (ERP) for academies, schools, colleges and universities in Pakistan — one platform for admissions, fees, exams, attendance and reporting.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/education-management-system-pakistan' },
  openGraph: { type: 'website', url: '/education-management-system-pakistan', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'Education Management System Pakistan', item: 'https://marksly.pk/education-management-system-pakistan' },
  ],
};

const MODULES = [
  { icon: Layers, title: 'One system, every level', desc: 'The same platform runs academies, schools, colleges and universities — configured around your own classes, sections and departments.' },
  { icon: FileText, title: 'Admissions to results', desc: 'Student records, exams and results tracked end to end, with a full history kept per student.' },
  { icon: Wallet, title: 'Finance', desc: 'Fee structures, billing, discounts, dues and receipts — with JazzCash, EasyPaisa, bank transfer and challans.' },
  { icon: Network, title: 'Multi-institution ready', desc: 'Role-based access across admins, teachers, accountants and parents, isolated per institution.' },
  { icon: BarChart2, title: 'Live reporting', desc: 'Attendance, fees and results in one dashboard — updated as data comes in, not at end of term.' },
  { icon: MessageSquare, title: 'Communication', desc: 'WhatsApp and SMS alerts for attendance, fees and notices — reaching parents where they already are.' },
];

const WHY_PAKISTAN = [
  'One ERP that adapts to academies, schools, colleges and universities alike',
  'Local payment methods: JazzCash, EasyPaisa, bank transfer and challans',
  'WhatsApp and SMS communication built in — no separate app needed for parents',
  'PKR pricing, with a free plan for institutions up to 50 students',
  'Data isolated and role-protected per institution, with real human support',
];

const FAQ = [
  { q: 'What is an education management system?', a: 'An education management system (also called an education ERP) is software that centralizes admissions, attendance, exams, fees, timetable, and communication for an educational institution, replacing manual processes and disconnected tools.' },
  { q: 'Does Marksly work for universities, not just schools?', a: 'Yes — Marksly is configured around your own classes, sections and departments, so the same platform works for academies, schools, colleges, and universities.' },
  { q: 'What makes it suitable for Pakistan specifically?', a: 'Local payment methods (JazzCash, EasyPaisa, bank transfer, challans), WhatsApp/SMS communication, and PKR pricing — built around how institutions in Pakistan actually operate day to day.' },
  { q: 'Can I try it before paying?', a: 'Yes — the free plan covers institutions up to 50 students, with no card required and no time limit.' },
  { q: 'Is our data isolated from other institutions using Marksly?', a: 'Yes — each institution’s data is isolated and protected, with role-based access throughout the platform.' },
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

export default function EducationManagementSystemPakistanPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <MarketingHeader />

      <PageHero
        eyebrow="Education ERP for Pakistan"
        title="One education management system, every level"
        description="Academies, schools, colleges and universities — admissions, fees, exams, attendance and reporting, all in one platform built for Pakistan."
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
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Why institutions in Pakistan choose Marksly</h2>
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
            Set up your institution on Marksly today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Free for up to 50 students, no card required. See admissions, fees, exams and reporting connected from day one.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)] sm:w-auto`}
            >
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/pricing" className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2 sm:w-auto`}>
              <BarChart2 aria-hidden size={16} />
              See pricing
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
