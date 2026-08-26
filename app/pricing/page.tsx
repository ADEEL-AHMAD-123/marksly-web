import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';
import { PricingPlans } from '@/components/marketing/PricingPlans';

const TITLE = 'Pricing — Marksly School & Campus Management Software';
const DESCRIPTION =
  'Simple, transparent pricing for Marksly — the school management system built for academies, schools, colleges and universities. Start free, upgrade as you grow.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: { type: 'website', url: '/pricing', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  { q: 'Is there a free plan?', a: 'Yes — the free plan works for up to 50 students, with no card required and no time limit.' },
  { q: 'Can I cancel anytime?', a: 'Yes. There are no long-term contracts — upgrade, downgrade or cancel whenever you need to.' },
  { q: 'How do I pay?', a: 'Paid plans are billed by card through a secure payment page, with optional auto-renewal so you never have to remember to pay manually. Bank transfer is also available.' },
  { q: 'What happens if I go over my student limit?', a: 'We’ll let you know before you hit the limit so you can upgrade — your data and access are never cut off without warning.' },
  { q: 'What if my institution needs more than the largest plan covers?', a: 'Contact us directly — we can talk through what your institution needs.' },
];

// FAQPage structured data — matches the visible FAQ section 1:1 below (never
// list a question here that isn't actually rendered on the page, and vice
// versa — Google's guidelines require the structured data to reflect real,
// visible content, not just be a copy for rich-result purposes).
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <MarketingHeader active="/pricing" />

      <PageHero
        eyebrow="Pricing"
        title="Simple, fair pricing"
        description="Start free. Upgrade when you grow. No card required to begin, cancel anytime."
      />

      {/* Plans — fetched live from the backend so this page can never drift
           out of sync with what billing.service.ts actually charges */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto max-w-6xl px-5">
          <PricingPlans />
          <p className="mt-6 px-4 text-center text-xs text-muted-foreground sm:mt-8 sm:px-0 sm:text-sm">
            Prefer annual billing?{' '}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Contact us
            </Link>{' '}
            for discounted annual pricing.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-card/40 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Pricing questions</h2>
          </div>
          <div className="mt-8 divide-y divide-border sm:mt-10">
            {FAQ.map((item) => (
              <div key={item.q} className="py-4 sm:py-5">
                <h3 className="text-sm font-semibold sm:text-base">{item.q}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground sm:text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-sidebar py-14 text-sidebar-foreground sm:py-20">
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-accent opacity-[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to modernise your institution?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-sidebar-muted sm:text-base">Create your account and start your free trial today — no card required.</p>
          <Link href="/register" className={`${buttonVariants({ size: 'lg' })} mt-7 w-full !bg-accent !text-accent-foreground hover:!bg-accent/90 sm:w-auto`}>
            Start free trial <ArrowRight aria-hidden size={18} />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
