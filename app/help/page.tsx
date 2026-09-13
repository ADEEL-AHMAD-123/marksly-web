import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircle, ArrowRight, Rocket, Wallet, MessageSquare, ShieldCheck, ChevronDown, GraduationCap, BarChart2, LayoutDashboard, Bell } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'Help Center';
const DESCRIPTION =
  'Common Marksly questions — getting started, fees & billing, the parent & student portal, exams, notices, messaging, reports and account security.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/help' },
  openGraph: { type: 'website', url: '/help', title: `${TITLE} | Marksly`, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: `${TITLE} | Marksly`, description: DESCRIPTION },
};

const TOPICS = [
  {
    slug: 'getting-started', category: 'Getting started', icon: Rocket,
    items: [
      { q: 'How do I create my institution’s account?', a: 'Click “Start free trial” on the homepage, fill in your institution’s details, and verify your email — your account is ready in a couple of minutes, no card required.' },
      { q: 'Is Marksly only for schools?', a: 'No — it works for academies, schools, colleges and universities. The modules and terminology adapt to your institution type.' },
      { q: 'Can I import my existing student data?', a: 'Yes — the Students module supports bulk CSV import, so you can bring in your existing roster instead of entering students one by one.' },
      { q: 'Do I need to install anything?', a: 'No — Marksly runs entirely in your browser, on desktop or mobile. There’s nothing to install for admins, teachers or parents.' },
    ],
  },
  {
    slug: 'fees-billing', category: 'Fees & billing', icon: Wallet,
    items: [
      { q: 'How does subscription billing work?', a: 'Growth-plan subscriptions are billed monthly through a secure card checkout, with optional auto-renewal so you don’t have to remember to pay each month. Bank transfer is also available if you’d rather pay manually.' },
      { q: 'Can I turn off auto-renewal?', a: 'Yes — go to your Billing settings and disable auto-renewal at any time. Your saved card is removed from our system when you do.' },
      { q: 'How do parents pay student fees?', a: 'You record fee payments however your institution already collects them — cash, bank transfer, JazzCash, or EasyPaisa — and Marksly tracks invoices, dues, and receipts for you.' },
      { q: 'What happens if a payment fails?', a: 'Failed auto-renewal charges are retried automatically over the following week. If it still doesn’t go through, your account moves to a grace period rather than being cut off immediately, and you’ll be notified by email.' },
      { q: 'Do you offer annual billing?', a: 'Yes — annual billing is available on the Growth and Institution plans at a discount. Contact us and we’ll set it up for you.' },
      { q: 'Will I get a receipt for every payment?', a: 'Yes — a receipt is generated automatically for every successful payment and sent to your billing email.' },
      // Online fee payment (card/JazzCash/EasyPaisa) commented out for now -- not ready to advertise publicly yet.
      // { q: 'Can parents pay student fees online?', a: 'Yes — parents can pay an invoice directly from their portal by card, JazzCash, EasyPaisa or bank transfer. The invoice is marked paid automatically the moment the payment settles, so there’s nothing for your office to record by hand.' },
      { q: 'Can a fee be waived or corrected after it’s issued?', a: 'Yes — an admin can waive an invoice or void a payment, each with a reason recorded. Nothing about what a family owes changes silently; every adjustment is on the record.' },
    ],
  },
  {
    slug: 'parent-portal', category: 'Parent & student portal', icon: LayoutDashboard,
    items: [
      { q: 'What can parents see in their portal?', a: 'Each parent gets one dashboard covering every one of their children — attendance, results, fee dues, and notices — even if their kids are in different classes or grades.' },
      { q: 'Can students take exams online through the portal?', a: 'Yes — for exams your institution sets up as timed online exams, students take them directly from their own portal, and results are available as soon as they’re published.' },
      { q: 'Do parents and students need to install an app?', a: 'No — the portal works in any browser, on a phone or a computer, just like the rest of Marksly.' },
      { q: 'How does a parent get portal access?', a: 'When a student is added, their guardian’s contact is linked automatically and a portal PIN is issued — no separate signup needed.' },
    ],
  },
  {
    slug: 'students-exams', category: 'Students & exams', icon: GraduationCap,
    items: [
      { q: 'Can teachers only see their own classes?', a: 'Yes — access is role-based, so teachers see the classes and sections assigned to them, while admins have full visibility across the institution.' },
      { q: 'How does exam grading work?', a: 'You define the grading scheme once — percentage/letter, GPA, or Cambridge-style — and Marksly calculates grades automatically as marks are entered on the exam grid.' },
      { q: 'Can I move a student between sections or classes?', a: 'Yes — update the student’s record from the Students module, and their attendance and exam history carries forward with them.' },
      { q: 'How do students move up to the next class at year-end?', a: 'Use the promotion tool to move an entire class or section to the next grade in one action — students who repeat a year can be handled in the same batch.' },
    ],
  },
  {
    slug: 'messaging', category: 'Messaging', icon: MessageSquare,
    items: [
      { q: 'Do you support WhatsApp and SMS?', a: 'Yes. Once your provider keys are connected, you can send attendance alerts, fee reminders, and notices to parents and staff via WhatsApp or SMS, with a full delivery log.' },
      { q: 'Can I send messages in a language other than English?', a: 'Message text is free-form, so you can type and send a notice in any language. The dashboard interface itself is English only.' },
      { q: 'What if a message fails to deliver?', a: 'Failed deliveries are flagged in the message log so you know immediately, rather than assuming a notice reached a parent when it didn’t.' },
      { q: 'Can I message a single class instead of the whole institution?', a: 'Yes — you can target a message to a specific class or section, or send it institution-wide.' },
      { q: 'What’s the difference between messaging and notices?', a: 'Messaging (WhatsApp/SMS) reaches parents outside the app. Notices post inside Marksly itself — on the dashboard every parent, student and staff member already sees — and can optionally also go out by WhatsApp or SMS.' },
      { q: 'Do holidays show up as notices automatically?', a: 'Yes — adding a holiday posts a matching notice automatically, so it appears on every dashboard without being entered twice.' },
    ],
  },
  {
    slug: 'reports', category: 'Reports & data', icon: BarChart2,
    items: [
      { q: 'How often do reports update?', a: 'Live — as attendance is marked, marks are entered, or a fee is recorded, the relevant dashboards update immediately.' },
      { q: 'Can I export my data?', a: 'Yes — reports and student data can be exported, and your data stays yours if you ever decide to leave.' },
    ],
  },
  {
    slug: 'account-security', category: 'Account & security', icon: ShieldCheck,
    items: [
      { q: 'Is my institution’s data isolated from others?', a: 'Yes — Marksly is fully multi-tenant. Every institution’s data is isolated and protected, with role-based access so staff only see what their role permits.' },
      { q: 'I forgot my password — what do I do?', a: 'Use “Forgot password” on the sign-in page to receive a reset link by email.' },
      { q: 'How do I delete or deactivate a staff account?', a: 'An institution admin can deactivate any user from the Users section in the dashboard — this immediately revokes their access.' },
      { q: 'Can I have more than one admin?', a: 'Yes — you can add multiple staff members with admin permissions from the Users section, so responsibility isn’t tied to a single account.' },
      { q: 'What roles does Marksly support besides admin and teacher?', a: 'Admin, teacher, accountant, general staff, parent and student each get their own dashboard, scoped to exactly what that role needs — an accountant sees fees and payments, not exam grading, for example.' },
    ],
  },
];

// FAQPage structured data — flattens every Q&A actually rendered below into
// one list. Same rule as /pricing's FAQ_JSON_LD: never list a question here
// that isn't visible on the page, and vice versa.
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: TOPICS.flatMap((section) =>
    section.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'Help Center', item: 'https://marksly.pk/help' },
  ],
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />

      <MarketingHeader active="/help" />

      <PageHero
        eyebrow="Help Center"
        title="How can we help?"
        description={
          <>
            Answers to the questions we hear most. Can’t find what you need?{' '}
            <Link href="/contact" className="font-medium text-primary hover:underline">Contact us</Link> directly.
          </>
        }
      />

      {/* ── Quick jump — same pattern as /features ──────────────────────── */}
      <div className="mx-auto max-w-3xl px-5">
        <nav aria-label="Jump to topic" className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center">
          {TOPICS.map((t) => (
            <a
              key={t.slug}
              href={`#${t.slug}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-accent hover:text-accent"
            >
              {t.category}
            </a>
          ))}
        </nav>
      </div>

      <section className="pb-14 pt-6 sm:pb-20 sm:pt-8">
        <div className="mx-auto max-w-3xl space-y-10 px-5 sm:space-y-12">
          {TOPICS.map((section) => (
            <div key={section.category} id={section.slug} className="scroll-mt-20 sm:scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <section.icon aria-hidden size={16} />
                </span>
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">{section.category}</h2>
              </div>
              <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm sm:mt-4">
                {section.items.map((item) => (
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
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-sidebar py-14 text-sidebar-foreground sm:py-20">
        <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-1/3 bg-accent opacity-[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Still need help?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-sidebar-muted sm:text-base">
            Our team is happy to walk you through anything Marksly can do for your institution.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="mailto:support@marksly.pk" className={`${buttonVariants({ variant: 'secondary' })} w-full sm:w-auto`}>
              <Mail aria-hidden size={16} /> Email support
            </a>
            <Link href="/contact" className={`${buttonVariants()} w-full sm:w-auto !bg-accent !text-accent-foreground hover:!bg-accent/90`}>
              <MessageCircle aria-hidden size={16} /> Contact us <ArrowRight aria-hidden size={16} />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
