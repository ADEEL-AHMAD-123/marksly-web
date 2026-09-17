// Icon KEYS only, not the lucide components themselves — this file is
// imported by app/help/page.tsx (a server component) to build the
// FAQPage/BreadcrumbList structured data, and the exact same HELP_TOPICS
// value is passed as a prop into HelpFaqSearch (a client component) to
// render the actual list. A React component reference (e.g. the Rocket
// icon itself) isn't serializable across that server->client boundary --
// Next.js's build fails outright trying to pass one ("Functions cannot be
// passed directly to Client Components"). Storing a plain string key here
// and resolving it to the real icon component only inside HelpFaqSearch
// (which is already client-side, so no serialization involved) avoids that
// entirely while keeping this file as the single source of truth for both
// the content AND which icon each topic uses.
export type HelpIconKey = 'rocket' | 'wallet' | 'layout-dashboard' | 'graduation-cap' | 'message-square' | 'bell' | 'bar-chart-2' | 'shield-check';

export interface HelpItem {
  q: string;
  a: string;
}

export interface HelpTopic {
  slug: string;
  category: string;
  icon: HelpIconKey;
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
    slug: 'getting-started', category: 'Getting started', icon: 'rocket',
    items: [
      { q: 'How do I create my institution’s account?', a: 'Click “Start free trial” on the homepage, fill in your institution’s details, and verify your email — your account is ready in a couple of minutes, no card required.' },
      { q: 'Is Marksly only for schools?', a: 'No — it works for academies, schools, colleges and universities. The modules and terminology adapt to your institution type.' },
      { q: 'Can I import my existing student data?', a: 'Yes — the Students module supports bulk CSV import, so you can bring in your existing roster instead of entering students one by one.' },
      { q: 'Do I need to install anything?', a: 'No — Marksly runs entirely in your browser, on desktop or mobile. There’s nothing to install for admins, teachers or parents.' },
      { q: 'Does Marksly support more than one campus or branch?', a: 'Each institution runs as its own isolated account. If you run multiple campuses or a multi-branch network, contact us — we set up a custom plan rather than making you self-serve something that big.' },
    ],
  },
  {
    // Marksly's OWN subscription billing (how your institution pays
    // Marksly) -- kept deliberately separate from 'fee-collection' below
    // (how families pay YOUR institution). Mixing the two in one topic
    // was actively confusing: "what happens if a payment fails" read as
    // if it were about a parent's fee payment when it was actually about
    // a subscription card charge.
    slug: 'subscription-billing', category: 'Your Marksly subscription', icon: 'wallet',
    items: [
      { q: 'How does subscription billing work?', a: 'Growth-plan subscriptions are billed monthly through a secure card checkout, with optional auto-renewal so you don’t have to remember to pay each month. Bank transfer is also available if you’d rather pay manually.' },
      { q: 'Can I turn off auto-renewal?', a: 'Yes — go to your Billing settings and disable auto-renewal at any time. Your saved card is removed from our system when you do.' },
      { q: 'What happens if a payment fails?', a: 'Failed auto-renewal charges are retried automatically over the following week. If it still doesn’t go through, your account moves to a grace period rather than being cut off immediately, and you’ll be notified by email.' },
      { q: 'Do you offer annual billing?', a: 'Yes — annual billing is available on the Growth and Institution plans at a discount. Contact us and we’ll set it up for you.' },
      { q: 'Will I get a receipt for every payment?', a: 'Yes — a receipt is generated automatically for every successful subscription payment and sent to your billing email.' },
      { q: 'What happens if my institution goes over its student limit?', a: 'We’ll let you know before you hit the limit so you can upgrade — access is never cut off without warning.' },
    ],
  },
  {
    // How YOUR institution collects fees from families — a different
    // question from the one above. This reflects the redesigned fee
    // module: bank-account-backed challans, manual recording, no
    // in-app checkout, and the roles behind each step.
    slug: 'fee-collection', category: 'Collecting fees from families', icon: 'wallet',
    items: [
      { q: 'How does fee collection actually work?', a: 'You add your own bank account and set up your fee structures once. Marksly then generates challans showing what’s due and your bank details — families pay you directly, the same way they always have (cash, bank transfer, JazzCash, EasyPaisa, cheque), and you record each payment as it comes in. Marksly tracks invoices, dues, receipts and a full history for you.' },
      { q: 'Does Marksly collect or hold the fee money itself?', a: 'No. Marksly never touches the money — challans carry your own bank account so whoever is paying, a parent or the student, pays your institution directly. There’s no online checkout, no gateway, and no delay waiting for funds to reach you.' },
      { q: 'Who can set up fee structures and bank accounts?', a: 'An institution admin. Bank accounts and fee structures live on their own tabs (Bank Accounts, Fee Structures) inside Fees, separate from day-to-day Collections, so setup doesn’t get mixed in with recording payments.' },
      { q: 'Who can record a payment day to day?', a: 'An admin, or a staff member with the accountant role — accountants see and manage fees, invoices and payments, but nothing outside that scope (no exam grading, no attendance, etc.).' },
      { q: 'What can parents and students see?', a: 'Their own portal shows every invoice/challan for their children — amount due, due date, status and payment history — downloadable and printable at any time. They view and pay outside the app; they don’t record payments themselves.' },
      { q: 'How do bills get generated — manually every time?', a: 'No — “Generate this month’s bills” runs the monthly billing for every active fee structure in one action. You can also generate for a single structure and a specific period (useful for backfilling a missed month), or create a one-time invoice for a one-off charge.' },
      { q: 'Can I print or export a batch of challans/invoices at once?', a: 'Yes — “Print all slips” generates one PDF with every unpaid challan for a chosen month (optionally scoped to a class or section) so you can hand out a batch after generating bills. Export CSV and Export payments give you the same data as a spreadsheet, for reporting or reconciling against a bank statement.' },
      { q: 'Can a fee be waived or corrected after it’s issued?', a: 'Yes — an admin can waive an invoice or void a payment, each with a reason recorded. Nothing about what a family owes changes silently; every adjustment is on the record.' },
    ],
  },
  {
    slug: 'parent-portal', category: 'Parent & student portal', icon: 'layout-dashboard',
    items: [
      { q: 'What can parents see in their portal?', a: 'Each parent gets one dashboard covering every one of their children — attendance, results, fee dues, and notices — even if their kids are in different classes or grades.' },
      { q: 'Can students take exams online through the portal?', a: 'Yes — for exams your institution sets up as timed online exams, students take them directly from their own portal, and results are available as soon as they’re published.' },
      { q: 'Do parents and students need to install an app?', a: 'No — the portal works in any browser, on a phone or a computer, just like the rest of Marksly.' },
      { q: 'How does a parent get portal access?', a: 'When a student is added, their guardian’s contact is linked automatically and a portal PIN is issued — no separate signup needed.' },
    ],
  },
  {
    slug: 'students-exams', category: 'Students, classes & exams', icon: 'graduation-cap',
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
    slug: 'notices-holidays', category: 'Notices & holidays', icon: 'bell',
    items: [
      { q: 'What’s the difference between a notice and a message?', a: 'A notice posts inside Marksly itself — on the dashboard every parent, student and staff member already sees — and can optionally also go out by WhatsApp or SMS. A message (WhatsApp/SMS) reaches parents outside the app directly.' },
      { q: 'Who can a notice be targeted to?', a: 'A specific class or section, a role (e.g. all teachers), or the whole institution — whoever actually needs to see it.' },
      { q: 'Do holidays show up as notices automatically?', a: 'Yes — adding a holiday posts a matching notice automatically, so it appears on every dashboard without being entered twice.' },
      { q: 'Can a notice expire?', a: 'Yes — set an expiry date and it quietly stops showing itself once it’s past, so old notices don’t clutter anyone’s dashboard.' },
      { q: 'Is there an in-app notification inbox, separate from notices and messaging?', a: 'Yes — every account has a personal inbox for updates specific to them (an attendance alert, a published result, an account change), so nothing depends on a notice or a WhatsApp message being seen in time.' },
    ],
  },
  {
    slug: 'messaging', category: 'WhatsApp & SMS messaging', icon: 'message-square',
    items: [
      { q: 'Do you support WhatsApp and SMS?', a: 'Yes. Once your provider keys are connected, you can send attendance alerts, fee reminders, and notices to parents and staff via WhatsApp or SMS, with a full delivery log.' },
      { q: 'Can I send messages in a language other than English?', a: 'Message text is free-form, so you can type and send a notice in any language. The dashboard interface itself is English only.' },
      { q: 'What if a message fails to deliver?', a: 'Failed deliveries are flagged in the message log so you know immediately, rather than assuming a notice reached a parent when it didn’t.' },
      { q: 'Can I message a single class instead of the whole institution?', a: 'Yes — you can target a message to a specific class or section, or send it institution-wide.' },
      { q: 'Is WhatsApp/SMS included in the price, or extra?', a: 'It’s a pay-as-you-go add-on available on any paid plan — you buy credits only if and when you need them, rather than paying for messaging capacity you don’t use.' },
    ],
  },
  {
    slug: 'reports', category: 'Reports & data', icon: 'bar-chart-2',
    items: [
      { q: 'How often do reports update?', a: 'Live — as attendance is marked, marks are entered, or a fee is recorded, the relevant dashboards update immediately.' },
      { q: 'Can I export my data?', a: 'Yes — reports and student data can be exported, and your data stays yours if you ever decide to leave.' },
      { q: 'Can I filter reports by class or section?', a: 'Yes — attendance, fee and results reports can all be narrowed to a specific class or section, not just viewed institution-wide.' },
    ],
  },
  {
    slug: 'account-security', category: 'Account & security', icon: 'shield-check',
    items: [
      { q: 'Is my institution’s data isolated from others?', a: 'Yes — Marksly is fully multi-tenant. Every institution’s data is isolated and protected, with role-based access so staff only see what their role permits.' },
      { q: 'I forgot my password — what do I do?', a: 'Use “Forgot password” on the sign-in page to receive a reset link by email.' },
      { q: 'How do I delete or deactivate a staff account?', a: 'An institution admin can deactivate any user from the Users section in the dashboard — this immediately revokes their access.' },
      { q: 'Can I have more than one admin?', a: 'Yes — you can add multiple staff members with admin permissions from the Users section, so responsibility isn’t tied to a single account.' },
      { q: 'What roles does Marksly support besides admin and teacher?', a: 'Admin, teacher, accountant, general staff, parent and student each get their own dashboard, scoped to exactly what that role needs — an accountant sees fees and payments, not exam grading, for example.' },
    ],
  },
];
