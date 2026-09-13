import {
  Rocket, Wallet, LayoutDashboard, GraduationCap, MessageSquare, Bell,
  BarChart2, ShieldCheck, type LucideIcon,
} from 'lucide-react';

export interface HelpItem {
  q: string;
  a: string;
}

export interface HelpTopic {
  slug: string;
  category: string;
  icon: LucideIcon;
  items: HelpItem[];
}

// Single source of truth for /help's content — imported by the page (server
// component, for metadata + FAQPage/BreadcrumbList structured data) and by
// HelpFaqSearch (client component, for the actual rendered + filterable
// list), so the two can never drift out of sync with each other. Same rule
// as elsewhere on the site: never list a question in structured data that
// isn't actually visible on the page, and vice versa.
export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: 'getting-started', category: 'Getting started', icon: Rocket,
    items: [
      { q: 'How do I create my institution’s account?', a: 'Click “Start free trial” on the homepage, fill in your institution’s details, and verify your email — your account is ready in a couple of minutes, no card required.' },
      { q: 'Is Marksly only for schools?', a: 'No — it works for academies, schools, colleges and universities. The modules and terminology adapt to your institution type.' },
      { q: 'Can I import my existing student data?', a: 'Yes — the Students module supports bulk CSV import, so you can bring in your existing roster instead of entering students one by one.' },
      { q: 'Do I need to install anything?', a: 'No — Marksly runs entirely in your browser, on desktop or mobile. There’s nothing to install for admins, teachers or parents.' },
      { q: 'Does Marksly support more than one campus or branch?', a: 'Each institution runs as its own isolated account. If you run multiple campuses or a multi-branch network, contact us — we set up a custom plan rather than making you self-serve something that big.' },
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
      { q: 'Can a fee be waived or corrected after it’s issued?', a: 'Yes — an admin can waive an invoice or void a payment, each with a reason recorded. Nothing about what a family owes changes silently; every adjustment is on the record.' },
      { q: 'What happens if my institution goes over its student limit?', a: 'We’ll let you know before you hit the limit so you can upgrade — access is never cut off without warning.' },
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
    slug: 'students-exams', category: 'Students, classes & exams', icon: GraduationCap,
    items: [
      { q: 'Can teachers only see their own classes?', a: 'Yes — access is role-based, so teachers see the classes and sections assigned to them, while admins have full visibility across the institution.' },
      { q: 'How does exam grading work?', a: 'You define the grading scheme once — percentage/letter, GPA, or Cambridge-style — and Marksly calculates grades automatically as marks are entered on the exam grid.' },
      { q: 'Can I move a student between sections or classes?', a: 'Yes — update the student’s record from the Students module, and their attendance and exam history carries forward with them.' },
      { q: 'How do students move up to the next class at year-end?', a: 'Use the promotion tool to move an entire class or section to the next grade in one action — students who repeat a year can be handled in the same batch.' },
      { q: 'Can students choose their own subjects?', a: 'If your institution offers electives, students can request to join a subject from their portal, and a teacher or admin approves or rejects each request — core subjects are assigned directly by an admin.' },
      { q: 'Who assigns a teacher to a subject?', a: 'An admin assigns one teacher per subject, per class or section — that teacher then shows up automatically wherever that subject is taught, on Timetable and on the exam grid.' },
      { q: 'Can I verify if a student or staff ID card is genuine?', a: 'Yes — every ID card’s QR code opens a public verification page showing the person’s name, class or role, and status. Gate staff or security can check it with just a phone camera, no login required.' },
    ],
  },
  {
    slug: 'notices-holidays', category: 'Notices & holidays', icon: Bell,
    items: [
      { q: 'What’s the difference between a notice and a message?', a: 'A notice posts inside Marksly itself — on the dashboard every parent, student and staff member already sees — and can optionally also go out by WhatsApp or SMS. A message (WhatsApp/SMS) reaches parents outside the app directly.' },
      { q: 'Who can a notice be targeted to?', a: 'A specific class or section, a role (e.g. all teachers), or the whole institution — whoever actually needs to see it.' },
      { q: 'Do holidays show up as notices automatically?', a: 'Yes — adding a holiday posts a matching notice automatically, so it appears on every dashboard without being entered twice.' },
      { q: 'Can a notice expire?', a: 'Yes — set an expiry date and it quietly stops showing itself once it’s past, so old notices don’t clutter anyone’s dashboard.' },
      { q: 'Is there an in-app notification inbox, separate from notices and messaging?', a: 'Yes — every account has a personal inbox for updates specific to them (an attendance alert, a published result, an account change), so nothing depends on a notice or a WhatsApp message being seen in time.' },
    ],
  },
  {
    slug: 'messaging', category: 'WhatsApp & SMS messaging', icon: MessageSquare,
    items: [
      { q: 'Do you support WhatsApp and SMS?', a: 'Yes. Once your provider keys are connected, you can send attendance alerts, fee reminders, and notices to parents and staff via WhatsApp or SMS, with a full delivery log.' },
      { q: 'Can I send messages in a language other than English?', a: 'Message text is free-form, so you can type and send a notice in any language. The dashboard interface itself is English only.' },
      { q: 'What if a message fails to deliver?', a: 'Failed deliveries are flagged in the message log so you know immediately, rather than assuming a notice reached a parent when it didn’t.' },
      { q: 'Can I message a single class instead of the whole institution?', a: 'Yes — you can target a message to a specific class or section, or send it institution-wide.' },
      { q: 'Is WhatsApp/SMS included in the price, or extra?', a: 'It’s a pay-as-you-go add-on available on any paid plan — you buy credits only if and when you need them, rather than paying for messaging capacity you don’t use.' },
    ],
  },
  {
    slug: 'reports', category: 'Reports & data', icon: BarChart2,
    items: [
      { q: 'How often do reports update?', a: 'Live — as attendance is marked, marks are entered, or a fee is recorded, the relevant dashboards update immediately.' },
      { q: 'Can I export my data?', a: 'Yes — reports and student data can be exported, and your data stays yours if you ever decide to leave.' },
      { q: 'Can I filter reports by class or section?', a: 'Yes — attendance, fee and results reports can all be narrowed to a specific class or section, not just viewed institution-wide.' },
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
