import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';

const TITLE = 'Privacy Policy';
const DESCRIPTION = 'How Marksly Pakistan collects, uses, stores and protects institution, student, staff and guardian data.';
const LAST_UPDATED = 'September 3, 2026';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <PageHero eyebrow="Legal" title="Privacy Policy" description={`Last updated: ${LAST_UPDATED}`} />

      <article className="mx-auto max-w-3xl px-5 pb-20">
        <p className="text-sm leading-relaxed text-muted-foreground">
          This policy explains what information Marksly (&quot;we&quot;, &quot;us&quot;, operated from Pakistan at marksly.pk)
          collects when an institution, its staff, students, or their guardians use our school and campus management
          platform, and how that information is used, stored, and protected. It applies to marksly.pk and the Marksly
          application itself.
        </p>

        <Section title="1. Who this applies to">
          <p>
            Marksly is used by institutions (schools, colleges, academies and universities) as the &quot;data
            controller&quot; for their own students&apos;, staff&apos;s and guardians&apos; information — the institution
            decides what data to enter and who to grant access to. Marksly acts as the &quot;data processor&quot;: we
            store and process that data on the institution&apos;s behalf, under the institution&apos;s instructions,
            using the security practices described below.
          </p>
        </Section>

        <Section title="2. What we collect">
          <p>Depending on how an institution uses Marksly, this can include:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Institution &amp; account data:</strong> institution name, type, address, contact email/phone, and admin/staff login credentials.</li>
            <li><strong>Student &amp; guardian data:</strong> name, date of birth, gender, roll/admission number, class/section, attendance records, exam results and grades, fee and payment records, guardian name/phone/email, and photos used for ID cards.</li>
            <li><strong>Staff data:</strong> name, contact details, role, and assigned classes/subjects.</li>
            <li><strong>Payment data:</strong> when an institution or a parent pays a fee through Marksly, payment processing is handled directly by our payment partners (Safepay, JazzCash, EasyPaisa) or via bank transfer — Marksly does not store full card numbers or banking credentials.</li>
            <li><strong>Usage data:</strong> login timestamps, IP address, and basic device/browser information, collected automatically for security and reliability.</li>
          </ul>
        </Section>

        <Section title="3. How we use this data">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To operate the core product — attendance, exams, fees, timetables, ID cards, and messaging, exactly as configured by the institution.</li>
            <li>To send transactional communications: fee reminders, exam results, attendance alerts, payment receipts and account notices, via email, WhatsApp, or SMS as configured.</li>
            <li>To process payments through our payment gateway partners, and to send fee receipts.</li>
            <li>To maintain the security of accounts (login monitoring, rate-limiting suspicious activity) and to investigate abuse.</li>
            <li>To improve the product — we do not sell personal data, and we do not use student or guardian data for advertising.</li>
          </ul>
        </Section>

        <Section title="4. Who we share data with">
          <p>
            We share data only with the service providers necessary to run Marksly, each acting under their own
            security and data-handling obligations:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Safepay, JazzCash and EasyPaisa</strong> — for processing card and mobile-wallet payments.</li>
            <li><strong>Resend</strong> — for sending transactional emails (verification, receipts, notifications).</li>
            <li><strong>Cloudinary</strong> — for storing uploaded photos (e.g. student ID photos).</li>
            <li><strong>Meta (WhatsApp Business API) and SMS providers</strong> — for delivering parent notifications an institution chooses to send.</li>
          </ul>
          <p>We do not sell, rent, or otherwise share personal data with third parties for their own marketing purposes.</p>
        </Section>

        <Section title="5. Data retention">
          <p>
            Institution, student, staff and academic records are retained for as long as the institution&apos;s
            account is active, so historical attendance, results and fee records remain available. In-app
            notifications are automatically deleted after 90 days. If an institution closes its account, it may
            request deletion or export of its data by contacting us (see below), subject to any records we&apos;re
            legally required to retain (e.g. payment records for tax/audit purposes).
          </p>
        </Section>

        <Section title="6. Security">
          <p>
            We use industry-standard practices to protect data in transit and at rest, including encrypted
            connections (HTTPS/TLS), hashed passwords, signed webhook verification for payment events, and
            rate-limiting on sensitive endpoints. No system is perfectly secure, and we encourage institutions to use
            strong, unique passwords for admin and staff accounts.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>
            A guardian, student, or staff member who wants to review, correct, or request deletion of their personal
            data should contact their institution directly, since the institution controls that data and is best
            placed to act on the request. Institutions can contact us at{' '}
            <a href="mailto:support@marksly.pk" className="text-primary hover:underline">support@marksly.pk</a> for
            help with data export or deletion requests.
          </p>
        </Section>

        <Section title="8. Children's data">
          <p>
            Marksly is built for schools to manage student records, which necessarily includes information about
            minors. This data is entered and controlled by the institution (not collected directly from children by
            Marksly), and access is restricted to the roles the institution grants — students, parents, teachers and
            admins each see only what their role permits.
          </p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>
            We may update this policy as the product changes. Material changes will be reflected by updating the
            &quot;Last updated&quot; date above.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about this policy or how your data is handled: email{' '}
            <a href="mailto:support@marksly.pk" className="text-primary hover:underline">support@marksly.pk</a> or
            reach us on WhatsApp at{' '}
            <a href="https://wa.me/923175496466" className="text-primary hover:underline">+92 317 5496466</a>.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            This policy is provided for transparency and general informational purposes and is not a substitute for
            professional legal advice specific to your institution&apos;s jurisdiction or obligations.
          </p>
        </Section>
      </article>

      <MarketingFooter />
    </div>
  );
}
