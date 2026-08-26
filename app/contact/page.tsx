import type { Metadata } from 'next';
import { Mail, MessageCircle, Clock } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';
import { ContactForm } from '@/components/marketing/ContactForm';

const TITLE = 'Contact Us';
const DESCRIPTION =
  'Get in touch with the Marksly team — questions about pricing, a demo for your school or college, or support for an existing account.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
  openGraph: { type: 'website', url: '/contact', title: `${TITLE} | Marksly`, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: `${TITLE} | Marksly`, description: DESCRIPTION },
};

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    detail: 'support@marksly.pk',
    href: 'mailto:support@marksly.pk',
    note: 'For sales questions, demos, and general support.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    detail: '+92 317 5496466',
    href: 'https://wa.me/923175496466',
    note: 'Fastest way to reach us for a quick question.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader active="/contact" />

      <PageHero
        eyebrow="Contact"
        title="Talk to us"
        description="Questions about pricing, a demo for your institution, or help with your account — we’re here for it."
      />

      <section className="pb-14 sm:pb-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-5 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* Form — the primary path, shown first on every breakpoint */}
          <ContactForm />

          {/* Direct channels + response times — secondary, alongside the form */}
          <div className="space-y-4 sm:space-y-5">
            {CHANNELS.map((c) => (
              <a
                key={c.title}
                href={c.href}
                className="group flex items-start gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <c.icon aria-hidden size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold sm:text-base">{c.title}</h2>
                  <p className="mt-0.5 text-sm font-medium text-primary">{c.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{c.note}</p>
                </div>
              </a>
            ))}

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-5">
              <Clock className="mt-0.5 shrink-0 text-primary" size={18} />
              <div>
                <h3 className="text-sm font-semibold">Response times</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  We typically reply within one business day. Existing customers with an urgent
                  account issue should sign in and use the support option in their dashboard.
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Prefer to browse first?{' '}
              <a href="/help" className="font-medium text-primary hover:underline">Visit the Help Center</a>
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
