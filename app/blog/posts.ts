export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readingTime: string;
  body: string[]; // paragraphs; a leading "## " marks a subheading
  author?: string; // defaults to "Marksly" if omitted — used in Article structured data
  modifiedDate?: string; // ISO — defaults to `date` if omitted, set this when a published post is edited
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-fee-collection-works-in-marksly',
    title: 'How Fee Collection Actually Works in Marksly (And Who Does What)',
    description:
      'A plain walkthrough of Marksly\'s fee module: how challans get generated, why Marksly never touches the money, and exactly what each role -- admin, accountant, parent, student -- can do.',
    date: '2026-09-16',
    readingTime: '6 min read',
    body: [
      'A lot of the confusion around school "fee management" software comes down to one unstated assumption: that the software collects the money. Marksly doesn\'t, and that\'s deliberate, not a missing feature. Here\'s the actual model, step by step, and what each role in your institution can and can\'t do within it.',
      '## The one-time setup: a bank account and a fee structure',
      'Before any challan can go out, an institution admin does two things once: add at least one bank account (the account families will actually pay into), and create at least one fee structure (what a class or the whole institution owes -- tuition, transport, hostel, an admission fee, whatever applies). Both live on their own tabs inside Fees -- Bank Accounts and Fee Structures -- kept separate from the day-to-day Collections tab so setup never gets mixed in with recording payments. A fee structure can be scoped to one class or the whole institution, billed automatically every month or generated on request, and can include discounts or per-student customization.',
      '## Generating bills',
      'Once setup is done, "Generate this month\'s bills" runs the monthly billing across every active, auto-billed fee structure in one action, creating a challan for every student it applies to. For a structure that bills less often, or a period you need to backfill, you can generate for just that one structure and pick the exact month. A one-time invoice covers a genuine one-off charge -- a fine, a specific event fee -- without needing a whole structure built around it.',
      '## What a challan actually is, and how it gets paid',
      'A challan is the printed or downloadable version of an invoice, carrying the amount due, the due date, and your institution\'s own bank account details. A parent or student pays that amount directly into your account -- cash, bank transfer, JazzCash, EasyPaisa, cheque, whatever your institution already accepts -- exactly the way they would with a paper challan from any bank. Marksly is never in that transaction. There\'s no checkout screen, no payment gateway, and no waiting for funds to clear through a third party before they reach you. The money goes straight from the payer to your account, the same day, every time.',
      '## Recording a payment',
      'Once a payment arrives -- however it arrived -- an admin or a staff member with the accountant role records it against the invoice: the amount, the method, the date, and an optional transaction or receipt reference. That single action updates the invoice status (pending, partial, paid, or overdue if the due date has passed), generates a receipt automatically, and adds the payment to that student\'s full history. Nothing about what a family owes is ever silently edited -- if a payment was recorded wrong, it\'s voided with a reason and recorded correctly, and if a fee is genuinely forgiven, it\'s waived with a reason. Both stay visible in the record permanently.',
      '## What each role can actually do',
      'An admin has the full picture: setting up bank accounts and fee structures, generating and backfilling bills, recording and correcting payments, and running bulk actions. An accountant role covers the day-to-day of Collections -- recording payments, viewing invoices and dues -- scoped so it never touches exam grading, attendance, or anything outside fees. A parent or student only ever sees their own (or their child\'s) invoices in their own portal: amount due, due date, status, and full payment history, downloadable and printable at any time. They can see exactly what\'s owed and what\'s been paid, but they don\'t record a payment themselves -- that stays a staff action, so there\'s always a single, auditable source of truth for what actually happened.',
      '## Handling more than one invoice at a time',
      'For the batch work that comes with running a whole institution\'s worth of billing, two actions cover it: "Print all slips" generates one PDF containing every unpaid challan for a chosen month, optionally narrowed to one class or section -- built for the once-a-month task of handing out a stack of physical challans after generating bills, and it skips already-paid invoices by default so a settled family never receives what looks like a fresh bill. Export CSV and Export payments give you the same underlying data as a spreadsheet -- one row per invoice, or one row per individual payment with its method, date and receipt number -- for reporting to a board, or reconciling against your own bank statement.',
      '## Why it works this way',
      'The short version: whoever is paying, pays your institution directly, with no delay and no middleman between the payment and your account -- the same guarantee a paper challan has always given, just without the paperwork. Marksly\'s job is to make what happens around that payment -- generating the challan, tracking who\'s paid and who hasn\'t, keeping receipts and a correction trail, and reaching parents automatically before a due date -- effortless, without ever putting itself between a family and the school\'s bank account.',
    ],
  },
  {
    slug: 'moving-from-registers-to-digital-attendance',
    title: 'Digital Attendance System for Schools in Pakistan: A Practical Guide',
    description:
      'How schools and academies in Pakistan can replace paper registers with a digital attendance system without disrupting the school day.',
    date: '2026-08-15',
    modifiedDate: '2026-09-07',
    readingTime: '5 min read',
    body: [
      'Most schools and academies in Pakistan still take attendance the same way they did decades ago: a paper register, a pen, and a teacher counting heads at the start of class. It works, but it comes with real costs — registers get lost or damaged, attendance percentages have to be calculated by hand at the end of term, and parents only find out their child was absent if someone happens to call them.',
      '## Why switch at all',
      'The case for digital attendance isn\'t about looking modern — it\'s about the specific problems a register can\'t solve. A register can\'t tell an admin in real time which sections are running low on attendance this week. It can\'t notify a parent the same day their child misses class. And it can\'t produce an accurate termly attendance report without someone manually adding up rows in a book.',
      '## Start with one class, not the whole school',
      'The most common mistake schools make is trying to switch every class over on the same day. Pick one section — ideally a teacher who\'s comfortable with a phone or tablet — and run it in parallel with the paper register for a week. This gives your staff a low-risk way to get comfortable with the new flow, and gives you a chance to catch any gaps (a class list that\'s out of date, a section that was never digitized) before it affects the whole school.',
      '## Get your student list right first',
      'Digital attendance is only as good as the student list behind it. Before switching a class over, make sure every student is enrolled with the correct section — this is usually the single biggest source of frustration in week one, when a teacher opens their attendance screen and a student is missing or listed under the wrong class. A bulk CSV import at the start, rather than adding students one by one, avoids most of this entirely.',
      '## Decide who gets notified, and how',
      'Once attendance is digital, you can notify parents automatically when their child is marked absent — but it\'s worth deciding upfront whether that should happen for every absence or only after a pattern (say, two unexplained absences in a week). Notifying on every single absence can feel excessive for a school with lenient late-arrival policies; for others, same-day notification is exactly the point.',
      '## Give it a full month before judging it',
      'Teachers who\'ve marked attendance on paper for years will be faster at it for the first week or two — that\'s normal, not a sign it isn\'t working. The real payoff shows up at reporting time: instead of a staff member spending a day adding up a term\'s worth of registers by hand, an admin can pull an accurate attendance report in seconds.',
    ],
  },
  {
    slug: 'how-to-choose-school-management-software',
    title: 'How to Choose School Management Software in Pakistan: 2026 Checklist',
    description:
      'A practical 2026 checklist for comparing school management software in Pakistan, including pricing, payments, parent messaging, data and support.',
    date: '2026-08-23',
    modifiedDate: '2026-09-07',
    readingTime: '6 min read',
    body: [
      'Search "school management software" and you\'ll find dozens of products with nearly identical feature lists — attendance, fees, exams, a parent app. The feature list rarely tells you what you actually need to know, which is whether the system fits how your specific institution runs day to day. Here\'s what\'s worth actually checking before you commit.',
      '## Does it match your institution type, or just "schools" in general?',
      'An academy running evening batches, a school with morning and afternoon shifts, and a college with subject-wise enrolment rather than fixed sections are structurally different. A system built around a single rigid model (one class, one section, one timetable per day) will fight you at every step if your institution doesn\'t work that way. Ask specifically how the system handles your actual structure, not whether it "supports schools."',
      '## Who actually has to use it every day',
      'The person evaluating software is rarely the person using it eight hours a day. A teacher who has to mark attendance for six classes needs that to take seconds, not a multi-step form. An admin generating a fee report at month-end needs it in three clicks, not a support ticket. Before deciding, have an actual teacher and an actual admin try the parts of the system they\'d use daily — not just watch a sales demo.',
      '## What happens when you outgrow the free tier',
      'Almost every provider has a free or cheap starting tier, and almost none of them make it obvious what changes when you cross the student limit. Ask directly: what\'s the price at 100 students, 300, 1000? Is there a setup fee to upgrade? Does your existing data carry over cleanly, or does upgrading mean re-entering everything? A system that\'s cheap to start and unclear to grow with is more expensive than one that\'s honest about both numbers upfront.',
      '## How parents actually get reached',
      'Most systems say they support "parent communication," but the mechanism matters. A system that requires parents to download a dedicated app will have a fraction of the reach of one that sends through WhatsApp or SMS, since that\'s where parents already check daily without being asked to install anything new. Ask for a real message to be sent to a real test number during evaluation, not just a screenshot of a message composer.',
      '## What happens to your data if you leave',
      'This is the question institutions ask least and regret not asking most. If you decide to switch systems in two years, can you export your student records, attendance history, and fee records in a usable format — or is your data effectively locked in? A provider confident in their product will have a straightforward answer to this; a vague one is a signal worth paying attention to.',
      '## The short version',
      'Ignore the feature checklist and ask instead: does it match how we actually run, will our staff actually use it daily without friction, is the pricing honest about growth, does it reach parents where they already are, and is our data ours if we ever need to leave. Those five questions eliminate most of the guesswork a feature comparison never resolves.',
    ],
  },
  {
    slug: 'exam-results-management-software-guide',
    title: 'Exam and Result Management Software for Schools: A Practical Guide',
    description:
      'How school exam and result management software reduces spreadsheet errors, automates grading and publishes results faster.',
    date: '2026-08-20',
    modifiedDate: '2026-09-07',
    readingTime: '5 min read',
    body: [
      'Exam season in most schools follows a familiar, error-prone pattern: teachers mark papers and record scores on paper or in a personal spreadsheet, someone then re-types those numbers into a master sheet, grades get calculated with a formula that\'s easy to get subtly wrong, and results get compiled by hand into report cards. Every one of those hand-offs is a place a mark can get transposed, a formula can reference the wrong column, or a student can be missed entirely.',
      '## Where the errors actually happen',
      'It\'s rarely the marking itself that goes wrong — a teacher grading a paper is usually accurate. The errors creep in during the re-entry step: a 78 becomes an 87, a mark gets entered in the wrong student\'s row, or a spreadsheet formula that worked for last term\'s grading scale silently breaks when this term\'s scale changes slightly. The more times a number gets manually copied between places, the more chances it has to become wrong.',
      '## What changes with a single entry point',
      'A structured exam system removes the re-typing step entirely: a teacher enters marks once, directly against the exam and the student, on the same grid every time. Grades calculate automatically from a scheme defined once at the institution level, so a grading-scale error only has to be caught and fixed in one place instead of hunted down across a dozen spreadsheets.',
      '## Publishing results without a bottleneck',
      'The other common failure point is results day itself — someone compiling report cards manually, printing them, and getting them into the right hands, all under time pressure. When marks are entered directly into the system that also holds student and class records, results can publish to students and parents the moment they\'re finalized, without a separate compilation step that has to happen before anyone sees anything.',
      '## Keeping a real history, not just this term\'s file',
      'A spreadsheet-based system tends to lose history — last year\'s results live in a file someone has to remember to keep, if it wasn\'t overwritten by mistake. A system built around exams as records rather than one-off files keeps every student\'s full result history in one place automatically, which matters the first time a parent asks for a transcript covering multiple years.',
      '## What to actually check before switching',
      'If you\'re evaluating a move away from spreadsheets, the two things worth confirming directly are: can you define your own grading scheme (not just a fixed A–F scale), and can results be published selectively — to one class, one exam, or the whole institution — rather than all-or-nothing. Those two details determine whether the system fits how your school actually runs exams, or just how a generic template assumes it does.',
    ],
  },
  {
    slug: 'reducing-late-fee-payments-schools',
    title: 'Reducing Late Fee Payments: What Actually Works for Schools and Academies',
    description:
      'Chasing overdue fees manually costs staff time every single month. A practical look at what reduces late payments without turning fee collection into a confrontation.',
    date: '2026-08-18',
    readingTime: '5 min read',
    body: [
      'Every school with a manual fee-collection process has the same recurring task: someone has to figure out who hasn\'t paid, then call, message, or send a note home to remind them. It\'s repetitive, it happens every single month, and it depends entirely on someone remembering to actually do it on time — which is exactly the kind of task that gets deprioritized the moment anything else demands attention.',
      '## Late payments are usually a reminder problem, not a willingness problem',
      'Most parents who pay late aren\'t refusing to pay — they simply didn\'t see a physical notice, or the reminder came after the due date instead of before it. A reminder sent three days before a due date changes behavior in a way a reminder sent a week after the due date can\'t; by the time the second one lands, the parent has already missed the window and the payment is now overdue by definition.',
      '## Why manual dues tracking makes this worse',
      'When dues are tracked in a register or a spreadsheet, an admin has to actively go looking for who\'s overdue before any reminder can go out — which means reminders happen in batches, whenever someone gets time to check, rather than automatically as each due date approaches. A structure that tracks dues per student in real time can flag exactly who\'s coming due without anyone manually cross-referencing a payment log against an enrolment list.',
      '## Automatic reminders vs. manual ones',
      'A reminder that fires automatically at set intervals — a few days before the due date, on the due date, and once shortly after if it\'s still unpaid — doesn\'t depend on a staff member remembering to send it. This matters more than it sounds: the actual cost of manual fee reminders isn\'t the time spent sending them, it\'s the ones that quietly never get sent because whoever was responsible got pulled onto something else that week.',
      '## Making receipts and history visible reduces disputes',
      'A surprising share of "late payment" disputes are actually record-keeping disputes — a parent insists they paid, and without an easy-to-pull payment history, resolving it becomes a back-and-forth over a physical receipt that may or may not still exist. A system that generates a receipt automatically for every payment and keeps a full history per student removes most of this friction; the record settles the question instead of a memory of who said what.',
      '## The realistic outcome',
      'None of this eliminates late payments entirely — some will always happen. What it changes is the amount of staff time spent chasing them, and how many of them happen simply because no one got around to sending a reminder that month. Automating the reminder and keeping an accurate, visible dues record removes the two most common reasons a payment ends up late by accident rather than by choice.',
    ],
  },
  {
    slug: 'qr-code-student-id-cards-guide',
    title: 'QR Code Student ID Cards: Why Schools Are Moving Away from Plain Laminated Cards',
    description:
      'A plain printed ID card only proves who a student is. A QR code on it can actually do something. Here\'s what that\'s useful for, practically.',
    date: '2026-08-12',
    readingTime: '4 min read',
    body: [
      'Most school ID cards do exactly one job: show a name, a photo, and a class, so a guard or a teacher can visually confirm who a student is. That\'s useful, but it\'s also all a plain laminated card can ever do — it can\'t be checked against a system, it can\'t confirm anything automatically, and if a card is lost or a term ends, there\'s no way to link it back to a live record.',
      '## What a QR code actually adds',
      'A QR code printed on the card links back to that student\'s actual record in the school\'s system — scan it, and instead of relying on a guard recognizing a face, you get a real, current lookup: name, class, section, and whatever else the institution chooses to show. It turns a static card into something that can be verified against a live source instead of just trusted on sight.',
      '## Where this actually gets used',
      'The most common practical use is simple identity confirmation at points where it matters — a school gate, a library desk, an exam hall checking a student against a seating list. It\'s not about replacing every manual process overnight; it\'s about having a fast, reliable way to confirm identity in the specific moments where getting it wrong (the wrong student in an exam seat, an unrecognized visitor at a gate) actually has consequences.',
      '## Reprinting doesn\'t mean starting over',
      'A common concern is what happens when a card is lost, or when a new batch of students joins mid-year. With a static laminated card, that means redesigning and reprinting from scratch. With a QR-linked card generated from the same system that holds student records, reprinting a batch — for one new section, or one lost card — takes the same few minutes it took the first time, because the design and the data are already there.',
      '## What to check before switching',
      'The two things worth confirming before moving to QR-based ID cards: can cards be generated and printed in bulk, class by class, rather than one at a time — and does the card\'s design stay consistent across the whole institution rather than drifting between whoever printed which batch. Both matter more for the day-to-day usefulness of the card than the QR code itself.',
    ],
  },
  {
    slug: 'marksly-reviews-what-schools-say',
    title: 'Marksly Reviews: What Schools in Pakistan Actually Say About It',
    description:
      'Real feedback from schools and colleges running Marksly today — what changed for their attendance, fees, exams and parent communication, in their own words.',
    date: '2026-09-03',
    readingTime: '4 min read',
    body: [
      'If you\'re researching "Marksly" or "Marksly reviews" before evaluating it for your own institution, the short answer is: this is a Pakistan-based school and campus management platform, and the schools and colleges actually running it day to day are the ones best placed to say whether it holds up in practice. Rather than a generic pitch, here\'s what real institutions using Marksly have said, and what specifically changed for them.',
      '## Faster exam results',
      'Al-Noor Scholars Academy\'s principal put it plainly: exam results that used to take almost a week to compile now go out in a day, with parents able to check their child\'s report the moment it\'s published. That\'s the pattern across most institutions moving off spreadsheets — the time isn\'t lost in marking, it\'s lost in the manual compile-and-distribute step afterward, and that\'s exactly the step Marksly removes.',
      '## Fee collection that doesn\'t depend on someone remembering to call',
      'Quaid-e-Azam Future School\'s administrator noted that fee follow-ups used to mean calling parents individually — with automatic reminders instead, their collection genuinely got faster. This is a common theme: late fee payments are often less about parents being unwilling to pay and more about nobody consistently following up until a system does it automatically.',
      '## Built around how Pakistani institutions actually operate',
      'Iqbal Heights School\'s principal highlighted something specific to the Pakistani market: parents keep paying JazzCash, EasyPaisa or bank transfer directly, the way they always have, and it\'s recorded in Marksly the moment it happens — no new payment habit to explain to anyone. A lot of school software is built for a different market first and adapted later — for an institution here, whether that fits how payments actually happen day to day, not an afterthought, is a real practical difference.',
      '## An easy switch from paper',
      'The Knowledge Gate School\'s head of administration described moving from paper registers to Marksly for attendance as "the easiest transition of any system we\'ve tried," with teachers picking it up in a day. Crescent College of Excellence\'s administrator made a similar point about exam scheduling and multi-section management — going from a spreadsheet-based process to one system their staff actually enjoy using.',
      '## Less manual work at reporting time',
      'National Institute of Modern Studies\' director pointed to something easy to underestimate until you\'ve done it by hand: ID cards and reporting tools alone saved them weeks of manual work every term.',
      '## Read the full reviews',
      'These are excerpts — the complete set of reviews, with each institution\'s name and role, is on Marksly\'s testimonials page at marksly.pk/testimonials. Every quote there was drafted and then confirmed directly with the named school or college before publishing, rather than written and attributed without their sign-off.',
      'If you\'re comparing Marksly against other options — including any other similarly-named product — the schools quoted above are real, named, and reachable through Marksly\'s contact page if you\'d like to verify directly.',
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
