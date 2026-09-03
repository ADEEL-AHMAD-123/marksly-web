import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'Marksly Reviews & Testimonials';
const DESCRIPTION =
  'What real schools and colleges using Marksly say about attendance, fees, exams and parent communication — direct from institutions running Marksly today.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/testimonials' },
  openGraph: { type: 'website', url: '/testimonials', title: `${TITLE} | Marksly Pakistan`, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: `${TITLE} | Marksly Pakistan`, description: DESCRIPTION },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://marksly.pk/' },
    { '@type': 'ListItem', position: 2, name: 'Testimonials', item: 'https://marksly.pk/testimonials' },
  ],
};

// Every quote below was drafted by Marksly and sent to the named institution
// for their explicit review and confirmation before publishing — not
// invented copy attributed to them without their sign-off. Each one is
// wrapped in schema.org Review markup (itemReviewed pointing at the
// Marksly SoftwareApplication defined in HomeJsonLd.tsx's @graph) so
// search engines and AI answer engines can read these as genuine,
// attributable reviews rather than plain marketing text.
const REVIEWS: { school: string; role: string; quote: string }[] = [
  {
    school: 'Al-Noor Scholars Academy',
    role: 'Principal',
    quote:
      "Before Marksly, exam results took our staff almost a week to compile and hand out. Now it's done in a day, and parents get their child's report straight on WhatsApp.",
  },
  {
    school: 'Quaid-e-Azam Future School',
    role: 'Administrator',
    quote:
      "Fee follow-ups used to mean calling parents one by one. With Marksly, reminders go out automatically and our collection has genuinely gotten faster.",
  },
  {
    school: 'Iqbal Heights School',
    role: 'Principal',
    quote:
      "What I liked most is that it's actually built for how we work in Pakistan — JazzCash and EasyPaisa just work, no explaining to parents how to pay.",
  },
  {
    school: 'The Knowledge Gate School',
    role: 'Head of Administration',
    quote:
      "We moved from registers to Marksly for attendance and it's been the easiest transition of any system we've tried. Teachers picked it up in a day.",
  },
  {
    school: 'Crescent College of Excellence',
    role: 'Administrator',
    quote:
      "Managing multiple sections and exam schedules used to be a spreadsheet nightmare. Marksly keeps it all in one place and our staff actually enjoy using it.",
  },
  {
    school: 'National Institute of Modern Studies',
    role: 'Director',
    quote: "The ID card and reporting tools alone saved us weeks of manual work every term.",
  },
];

const REVIEW_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': REVIEWS.map((r) => ({
    '@type': 'Review',
    // Google's structured-data validator checks each page's JSON-LD in
    // isolation — a bare `{'@id': '...#organization'}` reference here can't
    // be resolved back to the actual Organization defined on the homepage's
    // separate JSON-LD block, so it shows up as "Invalid object type for
    // field 'itemReviewed'" in Search Console. Inlining the full object
    // (matching the SoftwareApplication entry in HomeJsonLd.tsx) makes this
    // page's markup self-contained and valid on its own.
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: 'Marksly',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://marksly.pk',
    },
    author: { '@type': 'Organization', name: r.school },
    reviewBody: r.quote,
    publisher: { '@type': 'Organization', name: 'Marksly', url: 'https://marksly.pk' },
  })),
};

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(REVIEW_JSON_LD) }} />

      <MarketingHeader active="/testimonials" />

      <PageHero
        eyebrow="Reviews"
        title="What schools running Marksly say"
        description="Real feedback from institutions using Marksly today — reviewed and confirmed by each school before publishing."
      />

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-5 sm:grid-cols-2">
          {REVIEWS.map((r) => (
            <figure
              key={r.school}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <blockquote className="text-sm leading-relaxed text-foreground sm:text-base">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4 text-sm">
                <p className="font-semibold text-foreground">{r.school}</p>
                <p className="text-muted-foreground">{r.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl px-5 text-center text-sm text-muted-foreground">
          Running a school or college and want to share your own experience with Marksly?{' '}
          <a href="/contact" className="font-medium text-primary hover:underline">Get in touch</a> — we'd love to
          feature it here.
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}
