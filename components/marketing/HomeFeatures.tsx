import Link from 'next/link';
import {
  GraduationCap, CalendarCheck, Wallet, FileText, CalendarClock,
  CreditCard, MessageSquare, ArrowRight, Users,
} from 'lucide-react';

export function HomeFeatures() {
  return (
    <section className="py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">What&apos;s inside</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Everything your institution needs</h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            One connected system — no more juggling registers, spreadsheets and WhatsApp groups.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
          {/* Hero card — attendance, the daily-use core of the system,
              not a billing feature */}
          <div className="relative col-span-2 overflow-hidden rounded-2xl border border-border bg-sidebar p-5 text-sidebar-foreground sm:p-6 md:col-span-4 md:row-span-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <CalendarCheck aria-hidden size={20} />
              </span>
              <h3 className="text-lg font-bold sm:text-xl">Attendance, made effortless</h3>
            </div>
            <p className="mt-3 max-w-md text-sm text-sidebar-muted">
              Teachers mark attendance in seconds from any device. Admins get live, class-wise
              rates instantly — no more chasing paper registers at the end of the day.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['One-tap marking', 'Daily reports', 'Absentee alerts', 'Class & section wise'].map((t) => (
                <span key={t} className="rounded-full border border-sidebar-border bg-sidebar-accent/50 px-2.5 py-0.5 text-xs">{t}</span>
              ))}
            </div>
          </div>

          {[
            { icon: GraduationCap, title: 'Student records', desc: 'Admissions, profiles, classes and sections with bulk CSV import.' },
            { icon: CalendarClock, title: 'Timetable', desc: 'Weekly schedules per section, built and shared in minutes.' },
            { icon: Users, title: 'Teachers', desc: 'Staff profiles, class assignments, and workload at a glance.' },
            { icon: CreditCard, title: 'ID cards & reports', desc: 'Printable QR ID cards, plus live dashboards across every module.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-3.5 transition-shadow hover:shadow-md sm:p-5 md:col-span-2">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8">
                  <f.icon aria-hidden size={15} className="sm:hidden" />
                  <f.icon aria-hidden size={16} className="hidden sm:block" />
                </span>
                <h3 className="text-xs font-semibold sm:text-sm">{f.title}</h3>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">{f.desc}</p>
            </div>
          ))}

          {/* fifth "small" card — half-width on mobile so it pairs with Fees
              in one row; col-span-2 on desktop to complete the exact-fill
              row3 math (2 + 3×col-span-2 = 6 cols) */}
          <div className="rounded-2xl border border-border bg-card p-3.5 transition-shadow hover:shadow-md sm:p-5 md:col-span-2">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8">
                <MessageSquare aria-hidden size={15} className="sm:hidden" />
                <MessageSquare aria-hidden size={16} className="hidden sm:block" />
              </span>
              <h3 className="text-xs font-semibold sm:text-sm">WhatsApp &amp; SMS</h3>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">Attendance alerts and fee reminders, delivered where parents already are.</p>
          </div>

          {/* fees — pairs with WhatsApp above on mobile, still a full feature
              just no longer the flagship card */}
          <div className="order-1 rounded-2xl border border-border bg-card p-3.5 sm:p-5 md:order-none md:col-span-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8">
                <Wallet aria-hidden size={15} className="sm:hidden" />
                <Wallet aria-hidden size={16} className="hidden sm:block" />
              </span>
              <h3 className="text-xs font-semibold sm:text-sm">Fees &amp; billing</h3>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">Fee structures, monthly auto-billing, discounts, receipts and dues tracking.</p>
          </div>

          {/* second highlight — exams & results, the other core academic
              reason institutions adopt Marksly */}
          <div className="order-2 col-span-2 rounded-2xl border border-accent/30 bg-accent/10 p-4 sm:p-5 md:order-none md:col-span-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <FileText aria-hidden size={16} />
              </span>
              <h3 className="text-sm font-semibold">Exams &amp; results, simplified</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Fast marks entry on a grid, auto-calculated grades, and results published straight to students and parents.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center sm:mt-4">
          <Link
            href="/features"
            className="group flex flex-col items-center gap-1.5 text-center transition-all sm:flex-row sm:gap-4 sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:px-6 sm:py-4 sm:shadow-sm sm:hover:border-accent sm:hover:shadow-md"
          >
            <span className="hidden text-sm font-semibold sm:block">
              That&apos;s just a taste <span className="font-normal text-muted-foreground">— see the full feature list</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold leading-none text-primary-foreground transition-transform group-hover:translate-x-0.5">
              <span className="leading-none">See all features</span>
              <ArrowRight aria-hidden size={14} className="shrink-0" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
