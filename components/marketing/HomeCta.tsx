import Link from 'next/link';
import { ArrowRight, Check, MessageSquare } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';

export function HomeCta() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-background py-14 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: 'hsl(var(--accent))' }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 text-center sm:gap-10 lg:grid-cols-[1.2fr_1fr] lg:text-left">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Join institutions already on Marksly</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Your institution, running on one system — starting today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base lg:mx-0">
            Set up your students, classes, and fee structure in one sitting, and see attendance,
            results, and dues update live from day one.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-foreground sm:mt-7 sm:text-sm lg:justify-start">
            {['No card required', 'Setup in under 10 minutes', 'Cancel anytime'].map((r) => (
              <span key={r} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <Check aria-hidden size={14} className="shrink-0 text-accent" strokeWidth={3} />
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href="/register"
            className={`${buttonVariants({ size: 'lg' })} w-full justify-center shadow-[0_0_0_3px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.35)]`}
          >
            Start free trial <ArrowRight aria-hidden size={18} />
          </Link>
          <Link
            href="/contact"
            className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center gap-2 border-2`}
          >
            <MessageSquare aria-hidden size={16} />
            Talk to us first
          </Link>
        </div>
      </div>
    </section>
  );
}
