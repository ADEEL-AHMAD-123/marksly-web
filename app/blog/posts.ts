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
    slug: 'moving-from-registers-to-digital-attendance',
    title: 'Moving From Paper Registers to Digital Attendance: A Practical Guide',
    description:
      'A step-by-step plan for schools and academies in Pakistan switching from paper attendance registers to a digital system, without disrupting the school day.',
    date: '2026-08-15',
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
    slug: 'whatsapp-for-parent-communication-in-pakistan',
    title: 'Why WhatsApp Is the Right Channel for Parent Communication in Pakistan',
    description:
      'Schools in Pakistan already reach parents through WhatsApp groups. Here\'s how to do it in a way that scales past a few hundred students without becoming unmanageable.',
    date: '2026-08-10',
    readingTime: '4 min read',
    body: [
      'Walk into almost any private school or academy staff room in Pakistan and you\'ll find at least one WhatsApp group per class, run by a teacher or the class parent representative. It\'s not an accident — WhatsApp is where parents already are, and for a school, meeting parents on a channel they already check daily beats asking them to install a separate app or check a portal they\'ll forget about.',
      '## The problem with class WhatsApp groups at scale',
      'A single class group works fine. The trouble starts as a school grows: fifteen sections means fifteen groups to manage, fifteen places a fee reminder or a notice has to be posted separately, and no record of who actually received what. A parent who leaves a group, or a teacher who goes on leave mid-term, quietly breaks the whole communication chain for that section.',
      '## What a structured system adds',
      'The fix isn\'t abandoning WhatsApp — it\'s sending through it in a structured way instead of a manual group chat. A notice sent from a school management system can go out to every parent in a class, a whole grade, or the entire school, from one screen, with a delivery log showing who it reached. An attendance alert, a fee reminder, or an exam result can trigger automatically, without a staff member typing it out fifteen times.',
      '## What this looks like in practice',
      'A fee due-date reminder goes out three days before, one day before, and on the day itself, without anyone remembering to send it. An attendance alert reaches a parent the same afternoon their child was marked absent. A results announcement reaches every parent in a grade the moment marks are published, instead of a notice pinned to a board at the school gate.',
      '## The channel matters less than the structure',
      'None of this requires parents to change behavior — they still get a WhatsApp message, the same way they always have. What changes is what\'s behind it: one system sending it, one log of what went out, and no dependency on a single teacher\'s phone to keep a class connected.',
    ],
  },
  {
    slug: 'how-to-choose-school-management-software',
    title: 'How to Choose School Management Software: A Checklist for Academies, Schools and Colleges',
    description:
      'What to actually check before picking a school management system — beyond the feature list, the questions that determine whether it fits how your institution really runs.',
    date: '2026-08-23',
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
    title: 'Exam and Results Management: Moving From Spreadsheets to a Grading System',
    description:
      'Why re-typing marks from paper into Excel is where most exam-season errors come from, and what a structured exam and results system actually changes.',
    date: '2026-08-20',
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
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
