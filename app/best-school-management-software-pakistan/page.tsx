import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wallet, MessageSquare, ShieldCheck, Headphones, Settings, DollarSign,
  ArrowRight, Check, X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';
import { RelatedSolutions } from '@/components/marketing/RelatedSolutions';

const TITLE = 'Best School Management Software in Pakistan: How to Choose — Marksly';
const DESCRIPTION =
  'A practical checklist for choosing school or college management software in Pakistan — local payments, WhatsApp/SMS, pricing, and support — and how Marksly measures up.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/best-school-management-software-pakistan' },
  openGraph: { type: 'website', url: '/best-school-management-software-pakistan', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'Best School Management Software in Pakistan', item: 'https://marksly.pk/best-school-management-software-pakistan' },
  ],
};

// Honest evaluation criteria — genuinely useful whether or not someone picks
// Marksly. The "look for" column states what to check with ANY vendor; the
// Marksly column states plain facts about this product, not claims about
// named competitors (nothing here asserts what other named vendors do or
// don't do — only what to verify for yourself).
const CRITERIA = [
  {
    icon: Wallet,
    title: 'Local payment support',
    lookFor: 'Can parents actually pay the way they already do — JazzCash, EasyPaisa, bank transfer, or a printed challan — without a foreign card?',
    marksly: 'Built in: JazzCash, EasyPaisa, bank transfer and challans, with PKR pricing throughout.',
  },
  {
    icon: MessageSquare,
    title: 'Parent communication channel',
    lookFor: 'Does it reach parents where they already are (WhatsApp, SMS), or does it require them to install and check a separate app?',
    marksly: 'Attendance alerts, fee reminders and notices sent by WhatsApp or SMS — no parent-side app required.',
  },
  {
    icon: DollarSign,
    title: 'Pricing transparency',
    lookFor: 'Is pricing published, in your currency, with a real free tier to trial — or do you need a sales call to find out what it costs?',
    marksly: 'Published PKR pricing, with a free plan for up to 50 students, no card required.',
  },
  {
    icon: Settings,
    title: 'Curriculum flexibility',
    lookFor: 'Does it force a fixed grading/board structure, or can you configure your own classes, sections and grading scheme?',
    marksly: 'Curriculum-agnostic — works for provincial board (Matric), Cambridge (O/A Level), and Aga Khan system schools alike.',
  },
  {
    icon: ShieldCheck,
    title: 'Data isolation & security',
    lookFor: 'Is your institution’s data isolated from other customers, with role-based access per staff type?',
    marksly: 'Each institution’s data is isolated and protected, with role-based access throughout.',
  },
  {
    icon: Headphones,
    title: 'Support you can actually reach',
    lookFor: 'When something breaks during exam week, can you reach a real person quickly, or only a ticket queue?',
    marksly: 'Real human support by WhatsApp or email.',
  },
];

const FAQ = [
  {
    q: 'What is the best school management software in Pakistan?',
    a: 'It depends on what your institution needs most. If local payment methods (JazzCash, EasyPaisa, bank transfer, challans), WhatsApp/SMS parent communication, transparent PKR pricing, and a genuinely free tier to try first matter to you, Marksly is built specifically around those requirements for the Pakistani market.',
  },
  {
    q: 'How is Marksly different from a generic international school ERP?',
    a: 'Many school ERPs are built for markets where card payments and app-based parent portals are the norm. Marksly is built around how institutions in Pakistan actually operate — local payment rails, WhatsApp/SMS instead of a mandatory parent app, and PKR pricing from the start.',
  },
  {
    q: 'What should I check before choosing any school management system, not just Marksly?',
    a: 'Confirm: it supports the payment methods your families use, it reaches parents through a channel they already check, pricing is published and fits your budget with no forced annual contract, it fits your curriculum/grading structure without a rebuild, and you can reach real support quickly during peak periods like exams.',
  },
  {
    q: 'Can I try Marksly before switching from spreadsheets or another system?',
    a: 'Yes — Marksly has a free plan for up to 50 students with no card required, so you can run it alongside your current process before fully switching over.',
  },
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

export default function BestSchoolManagementSoftwarePakistanPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <MarketingHeader />

      <PageHero
        eyebrow="Buyer's guide"
        title="How to choose school management software in Pakistan"
        description="Marksly is a school and campus management system built for Pakistan — local payments, WhatsApp/SMS messaging, and transparent PKR pricing. Here's what to check before picking any vendor, and how Marksly measures up."
      />

      <section className="pb-14 sm:pb-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="space-y-5">
            {CRITERIA.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <c.icon aria-hidden size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{c.title}</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">What to check: </span>
                      {c.lookFor}
                    </p>
                    <p className="mt-2 flex items-start gap-2 text-sm">
                      <Check aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} />
                      <span><span className="font-medium">Marksly: </span>{c.marksly}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-4 text-sm text-warning">
            <X aria-hidden size={16} className="mt-0.5 shrink-0" />
            <p>
              Be cautious of any vendor that won&apos;t publish pricing, requires an annual contract before you can try it,
              or can&apos;t confirm local payment method support upfront — ask directly before committing.
            </p>
          </div>
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
            Try Marksly against this checklist yourself
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Free for up to 50 students, no card required — see how it fits your institution before deciding.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)] sm:w-auto`}
            >
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/pricing" className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2 sm:w-auto`}>
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <RelatedSolutions />

      <MarketingFooter />
    </div>
  );
}
