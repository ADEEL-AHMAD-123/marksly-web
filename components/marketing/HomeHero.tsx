import Link from 'next/link';
import {
  GraduationCap, CalendarCheck, Wallet, FileText, MessageSquare,
  ArrowRight, Activity, Check,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      {/* one deliberate background treatment, not a blob per section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] opacity-[0.08]"
        style={{ background: 'radial-gradient(60% 50% at 80% 0%, hsl(var(--primary)) 0%, transparent 70%), radial-gradient(40% 40% at 5% 15%, hsl(var(--accent)) 0%, transparent 70%)' }}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-16 pt-16 md:pb-24 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: copy */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Marksly for schools & colleges
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.05] md:text-6xl">
            The operating system<br className="hidden sm:block" /> for your <span className="text-primary">institution</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            Students, attendance, fees, exams, timetable, ID cards and parent messaging —
            one connected system, so your team spends less time on paperwork.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
            <Link href="/register" className={`${buttonVariants({ size: 'lg' })} w-full sm:w-auto`}>
              Start free trial <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/pricing" className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} w-full sm:w-auto`}>
              View pricing
            </Link>
          </div>

          {/* Inline stat bar — grid on mobile (no orphaned dividers when wrapping), dividers only once there's room to sit in one row */}
          <div className="mt-10 grid grid-cols-3 gap-x-3 gap-y-4 sm:mt-12 sm:flex sm:flex-wrap sm:items-start sm:gap-x-8">
            {[
              { value: 'Free', label: 'up to 50 students' },
              { value: '<10 min', label: 'to get started' },
              { value: '24/7', label: 'access, from any device' },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? 'sm:border-l sm:border-border sm:pl-8' : ''}>
                <p className="text-lg font-bold text-primary sm:text-xl">{s.value}</p>
                <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: product visual — a cleaner, more genuine-feeling dashboard preview */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-border bg-muted/60 px-5 py-2.5">
              <span className="rounded-md bg-card px-3 py-1 text-[11px] text-muted-foreground">app.marksly.pk</span>
              <span className="text-[11px] text-muted-foreground">Dashboard</span>
            </div>
            <div className="flex bg-background">
              <div className="hidden w-14 flex-col items-center gap-5 bg-sidebar py-6 sm:flex">
                <span className="h-6 w-6 rounded-md bg-accent" />
                {[GraduationCap, CalendarCheck, Wallet, FileText, MessageSquare].map((Icon, i) => (
                  <Icon key={i} aria-hidden size={16} className={i === 0 ? 'text-accent' : 'text-sidebar-muted'} />
                ))}
              </div>
              <div className="flex-1 p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Students', value: '1,248', icon: GraduationCap },
                    { label: 'Attendance', value: '96%', icon: CalendarCheck },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-card p-3.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                        <s.icon aria-hidden size={14} />
                      </span>
                      <p className="mt-2 text-xl font-bold">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* recent activity feed — feels like a real product, not a stat-tile cliché */}
                <div className="mt-3 rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Activity aria-hidden size={12} /> Recent activity
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {[
                      'Fee reminder sent to Grade 6 parents',
                      'Attendance submitted — Section B',
                      'Result published — Mid-term exam',
                    ].map((line) => (
                      <div key={line} className="flex items-center gap-2 text-[12px]">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                          <Check aria-hidden size={10} />
                        </span>
                        <span className="text-foreground/80">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* floating accent chip — small, deliberate depth cue */}
          <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-accent/30 bg-card px-4 py-3 shadow-lg sm:block">
            <p className="text-[11px] text-muted-foreground">Time saved weekly</p>
            <p className="text-lg font-bold text-accent">6+ hours</p>
          </div>
        </div>
      </div>
    </section>
  );
}
