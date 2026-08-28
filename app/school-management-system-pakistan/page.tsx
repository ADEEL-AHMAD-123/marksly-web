import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarCheck, Wallet, FileText, MessageSquare, GraduationCap,
  ArrowRight, Check, ShieldCheck, CreditCard, BarChart2,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'School Management System in Pakistan — Marksly';
const DESCRIPTION =
  'Marksly is a school management system built for Pakistan — attendance, fees, exams, timetable, ID cards, and WhatsApp/SMS parent messaging, with JazzCash & EasyPaisa support.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/school-management-system-pakistan' },
  openGraph: { type: 'website', url: '/school-management-system-pakistan', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'School Management System Pakistan', item: 'https://marksly.pk/school-management-system-pakistan' },
  ],
};

const MODULES = [
  { icon: CalendarCheck, title: 'Attendance', desc: 'Teachers mark attendance from any device — admins see it live, parents get absentee alerts automatically.' },
  { icon: FileText, title: 'Exams & results', desc: 'Marks entry on a fast grid, grades calculated automatically, results published straight to parents.' },
  { icon: Wallet, title: 'Fees & invoices', desc: 'Fee structures, monthly billing, discounts and dues — with JazzCash, EasyPaisa, bank transfer and challans.' },
  { icon: GraduationCap, title: 'Student records', desc: 'Admissions, profiles, classes and sections — bulk CSV import for your existing registers.' },
  { icon: MessageSquare, title: 'Parent communication', desc: 'Attendance alerts, fee reminders and notices sent by WhatsApp or SMS — where parents already are.' },
  { icon: CreditCard, title: 'ID cards', desc: 'Printable student ID cards with a scannable QR code, generated class by class.' },
];

const WHY_PAKISTAN = [
  'Local payment methods your families already use: JazzCash, EasyPaisa, bank transfer and challans',
  'WhatsApp and SMS messaging — no app download required for parents',
  'Works for Matric, Cambridge (O/A Level), and Aga Khan board schools alike',
  'Pricing in PKR, with a free plan for schools up to 50 students',
  'Real human support by WhatsApp or email, not a ticket queue',
];

const FAQ = [
  { q: 'What is a school management system?', a: 'A school management system is software that replaces registers, spreadsheets and manual fee collection with one connected platform — covering admissions, attendance, exams, fees, timetable and parent communication.' },
  { q: 'Is Marksly built specifically for schools in Pakistan?', a: 'Yes. Marksly supports local payment methods (JazzCash, EasyPaisa, bank transfer, challans), WhatsApp/SMS parent messaging, and pricing in PKR — built around how Pakistani schools actually operate.' },
  { q: 'Does it work for Matric and Cambridge system schools?', a: 'Yes — Marksly is curriculum-agnostic. You define your own classes, sections, subjects and grading scheme, so it works whether you follow a provincial board, Cambridge, or Aga Khan.' },
  { q: 'Is there a free plan?', a: 'Yes — free for up to 50 students, no card required, with no time limit.' },
  { q: 'How long does setup take?', a: 'Most schools are set up — classes, sections, and a fee structure — in under 10 minutes, and staff can start marking attendance the same day.' },
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

export default function SchoolManagementSystemPakistanPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <MarketingHeader />

      <PageHero
        eyebrow="For schools in Pakistan"
        title="A school management system built for Pakistan"
        description="Attendance, exams, fees, timetable and parent messaging — in one platform, with the local payment methods and channels your families already use."
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
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Why schools in Pakistan choose Marksly</h2>
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
            Set up your school on Marksly today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Free for up to 50 students, no card required. See attendance, exams, fees and messaging connected from day one.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)] sm:w-auto`}
            >
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/features" className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2 sm:w-auto`}>
              <BarChart2 aria-hidden size={16} />
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
