import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';
import { HelpFaqSearch } from '@/components/marketing/HelpFaqSearch';
import { HELP_TOPICS } from '@/lib/help-topics';

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

// FAQPage structured data — flattens every Q&A actually rendered below into
// one list, straight from the same HELP_TOPICS the page renders. Same rule
// as /pricing's FAQ_JSON_LD: never list a question here that isn't visible
// on the page, and vice versa. The client-side search in HelpFaqSearch only
// ever narrows what's visible after the fact — it doesn't change what's
// rendered server-side, so this stays accurate regardless.
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HELP_TOPICS.flatMap((section) =>
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

      {/* ── Search + quick jump + FAQ list — client component so search can
           filter without a page reload, while this page stays a server
           component for metadata + structured data ──────────────────────── */}
      <HelpFaqSearch topics={HELP_TOPICS} />

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
