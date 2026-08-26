import { Globe2, Zap, ShieldCheck } from 'lucide-react';

const DIFFERENTIATORS = [
  { n: '01', icon: Globe2, title: 'Built for how schools actually run', desc: 'Local payment rails and WhatsApp/SMS built in — not a global template with a translation bolted on.' },
  { n: '02', icon: Zap, title: 'Set up in minutes, not weeks', desc: 'No implementation team, no onboarding calls required. Create your institution and start using it today.' },
  { n: '03', icon: ShieldCheck, title: 'Your data, isolated and safe', desc: 'Every institution runs in its own isolated space, with role-based access controlling exactly who sees what.' },
];

export function HomeDifferentiators() {
  return (
    <section className="border-y border-border bg-accent/10">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Why Marksly</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Built differently, on purpose</h2>
        </div>

        {/* connected roadmap — numbered nodes linked by a line, read left-to-right
            as a sequence rather than three unrelated cards */}
        <div className="relative mt-12 sm:mt-16">
          <div aria-hidden className="absolute left-[22px] top-3 bottom-3 w-px bg-primary/15 md:left-0 md:right-0 md:top-[22px] md:bottom-auto md:h-px md:w-auto" />

          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.n} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
                  {d.n}
                </div>
                <div className="pt-1 md:pt-0">
                  <h3 className="text-lg font-semibold md:mt-5">{d.title}</h3>
                  <p className="mt-1.5 max-w-[240px] text-sm leading-relaxed text-muted-foreground md:mx-auto">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
