'use client';

import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPS, type Step } from './billing.constants';

/* ── A small stepper so the flow always reads as "one thing at a time" ─── */
export function Stepper({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1',
              i === activeIndex && 'bg-primary-soft text-primary-soft-foreground',
              i < activeIndex && 'text-foreground'
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                i <= activeIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {i < activeIndex ? <Check size={10} /> : i + 1}
            </span>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight size={13} className="text-muted-foreground/50" />}
        </div>
      ))}
    </div>
  );
}
