import { CalendarCheck, FileText, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { AuthCardShell } from '@/components/auth/AuthCardShell';

const FEATURES = [
  { icon: CalendarCheck, title: 'Attendance in seconds', desc: 'Teachers mark it, admins see live rates instantly.' },
  { icon: FileText, title: 'Exams, graded automatically', desc: 'Marks entry on a fast grid, results published in one click.' },
  { icon: ShieldCheck, title: 'Your data, isolated and safe', desc: 'Every institution runs in its own protected space.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // On mobile this is just a normal, page-scrolling single column (no
    // height/overflow constraints — the `lg:` variants below don't apply).
    // At `lg:` and up it becomes a fixed-height, two-column split: `h-screen`
    // + `overflow-hidden` on the outer grid stops the WHOLE page from ever
    // scrolling, and each column gets its OWN `overflow-y-auto` instead (see
    // both children below). Without this, a longer form (register, with 7
    // fields, vs. login's 2) makes `<main>` taller than the viewport, which
    // stretches the grid row to match — dragging the brand panel's height
    // along with it. That's what caused the reported bug: switching between
    // login and register visibly resized/reflowed the LEFT side too, and the
    // brand panel's `justify-between` content (logo / headline / trust note)
    // would end up spread across a much taller area, or its bottom note
    // scrolled out of view together with the whole page. Independent scroll
    // regions mean the brand panel is always exactly one viewport tall and
    // never moves, no matter what's on the form side.
    <div className="bg-background lg:grid lg:h-screen lg:grid-cols-[1.05fr_1fr] lg:overflow-hidden">
      {/* ── Brand panel (desktop) ───────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-y-auto bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14">
        {/* Dot-grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(hsl(var(--sidebar-foreground) / 0.06) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Soft glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-primary opacity-20 blur-3xl"
        />

        <Logo size={40} className="relative shrink-0" textClassName="text-xl" />

        {/* Headline + features */}
        <div className="relative my-auto max-w-md py-8">
          <h2 className="text-3xl font-bold leading-[1.15] xl:text-[2.6rem]">
            One system for your whole institution.
          </h2>
          <p className="mt-4 text-sidebar-muted">
            From academies to universities — manage attendance, exams, fees,
            timetable and parent communication in one platform.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-active">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-sidebar-muted">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Honest trust note — no fabricated quote; real institutions are
             already shown, with real logos, on the homepage's trust section */}
        <div className="relative shrink-0 rounded-2xl border border-sidebar-border bg-sidebar-accent p-5">
          <p className="text-sm leading-relaxed text-sidebar-foreground">
            No card required to start. Set up your institution and see it running in minutes.
          </p>
        </div>
      </aside>

      {/* ── Form panel ──────────────────────────────────────────── */}
      {/* `items-center` + `justify-center` on a `min-h-screen` flex column
          dead-centers short content (e.g. the verify-email success/error
          states) in the exact middle of the viewport, leaving huge empty
          margins above and below on mobile — looks like a broken/unfinished
          page rather than a designed one. Anchoring near the top with a
          fixed top offset instead, and wrapping the content in the same
          bg-card/border/shadow "card" treatment used elsewhere in the app
          (ContactForm, PricingPlans), gives every auth page — regardless of
          how much content it has — a consistent, finished, contained look.
          At `lg:`, this column scrolls independently of the brand panel
          (`lg:h-full lg:overflow-y-auto`, with `lg:min-h-0` overriding the
          mobile `min-h-screen` so the flex item can actually shrink/scroll
          instead of forcing the parent grid row to grow) and centers its
          content vertically when it fits (`lg:justify-center`) while still
          scrolling normally the moment it doesn't (register's longer form). */}
      <main className="relative flex min-h-screen flex-col items-center px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:h-full lg:min-h-0 lg:justify-center lg:overflow-y-auto lg:px-10 lg:py-12">
        <AuthCardShell>
          {/* Compact logo for mobile */}
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size={38} />
          </div>

          <div className="animate-auth-card-in overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-20px_rgba(0,0,0,0.18)]">
            {/* Tapered gold rule — same brand treatment as the marketing
                header, so the auth flow doesn't feel like a separate,
                unbranded template bolted onto the marketing site. */}
            <div
              aria-hidden
              className="h-[2.5px] w-full"
              style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
            />
            <div className="p-6 sm:p-8">{children}</div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Marksly · marksly.pk
          </p>
        </AuthCardShell>
      </main>
    </div>
  );
}
