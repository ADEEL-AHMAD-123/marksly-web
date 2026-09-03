import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'Terms of Service';
const DESCRIPTION = 'The terms that apply when an institution creates an account and uses Marksly Pakistan.';
const LAST_UPDATED = 'September 3, 2026';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90 sm:text-base">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <PageHero eyebrow="Legal" title="Terms of Service" description={`Last updated: ${LAST_UPDATED}`} />

      <article className="mx-auto max-w-3xl px-5 pb-20">
        <p className="text-sm leading-relaxed text-muted-foreground">
          These terms govern access to and use of Marksly (marksly.pk), a school and campus management platform
          operated from Pakistan. By creating an account, you agree to these terms on behalf of the institution you
          represent.
        </p>

        <Section title="1. The service">
          <p>
            Marksly provides software for managing attendance, fees, exams and results, timetables, student records,
            ID cards, and parent communication (WhatsApp/SMS/email). Features vary by plan; current plans and limits
            are shown on our{' '}
            <a href="/pricing" className="text-primary hover:underline">pricing page</a>.
          </p>
        </Section>

        <Section title="2. Accounts">
          <p>
            The person registering an institution confirms they are authorized to do so on the institution&apos;s
            behalf and to agree to these terms. The institution admin is responsible for managing which staff have
            access, for the accuracy of data entered, and for keeping login credentials secure. Sharing admin login
            credentials outside authorized staff is not permitted.
          </p>
        </Section>

        <Section title="3. Free trial and plans">
          <p>
            New institutions get a 14-day free trial with no card required. After the trial, continuing to use
            Marksly requires selecting a paid plan (or staying on the free tier if eligible) as described on the
            pricing page. Plan limits (e.g. student count) are enforced — an institution exceeding its plan&apos;s
            limit will be asked to upgrade before adding more students, and a downgrade that would put the
            institution over the new plan&apos;s limit is not permitted until usage is reduced.
          </p>
        </Section>

        <Section title="4. Billing and payments">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Subscription fees are billed monthly (or per the billing cycle shown at checkout) via Safepay, bank transfer, or another supported method.</li>
            <li>An institution that enables automatic renewal authorizes Marksly to charge its saved card each billing cycle; automatic renewal can be turned off at any time from the billing page.</li>
            <li>Add-on purchases (such as WhatsApp message credit packs) are pre-paid and non-refundable once messages have been sent against them.</li>
            <li>If a payment fails, we will notify the institution and attempt to retry automatically before the account is marked past due; continued non-payment may result in restricted access to paid features until resolved.</li>
            <li>Refunds for subscription payments are considered on a case-by-case basis — contact <a href="mailto:support@marksly.pk" className="text-primary hover:underline">support@marksly.pk</a>.</li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          <p>You agree not to use Marksly to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Store or process data you are not authorized to hold (e.g. records for students not actually enrolled at your institution).</li>
            <li>Send unsolicited or unrelated bulk messages to parents/guardians through the messaging features.</li>
            <li>Attempt to bypass plan limits, security controls, or rate limits, or to access another institution&apos;s data.</li>
            <li>Use the platform for any unlawful purpose.</li>
          </ul>
        </Section>

        <Section title="6. Data ownership">
          <p>
            The institution owns the data it enters into Marksly (students, staff, records, etc.). We process that
            data to provide the service, as described in our{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>. An institution may
            request an export of its data or account deletion by contacting support.
          </p>
        </Section>

        <Section title="7. Availability">
          <p>
            We aim for high reliability but do not guarantee uninterrupted access — scheduled maintenance, third-party
            outages (payment gateways, WhatsApp/SMS providers, hosting) or unforeseen issues can affect availability.
            We will make reasonable efforts to communicate significant planned downtime in advance.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            An institution may stop using Marksly and close its account at any time by contacting support. We may
            suspend or terminate an account for non-payment, violation of these terms, or activity that risks the
            security or integrity of the platform or other institutions&apos; data.
          </p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>
            Marksly is provided &quot;as is.&quot; To the extent permitted by law, we are not liable for indirect,
            incidental, or consequential damages arising from use of the platform. Our total liability for any claim
            relating to the service is limited to the fees paid by the institution in the three months preceding the
            claim.
          </p>
        </Section>

        <Section title="10. Governing law">
          <p>
            These terms are governed by the laws of Pakistan. Any dispute arising from these terms or use of Marksly
            will be subject to the exclusive jurisdiction of the courts of Pakistan.
          </p>
        </Section>

        <Section title="11. Changes to these terms">
          <p>
            We may update these terms from time to time; continued use of Marksly after an update constitutes
            acceptance of the revised terms. Material changes will be reflected by updating the &quot;Last
            updated&quot; date above.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these terms: email{' '}
            <a href="mailto:support@marksly.pk" className="text-primary hover:underline">support@marksly.pk</a>.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            These terms are provided for general informational purposes and are not a substitute for professional
            legal advice specific to your jurisdiction or circumstances.
          </p>
        </Section>
      </article>

      <MarketingFooter />
    </div>
  );
}
