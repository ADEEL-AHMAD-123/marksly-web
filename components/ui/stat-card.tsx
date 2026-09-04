import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-primary-soft text-primary-soft-foreground',
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  /** e.g. "+12%". Positive (default) shows green up arrow; negative red down. */
  delta?: string;
  deltaDirection?: 'up' | 'down';
  /** Plain, arrow-less badge for informational (not necessarily positive)
   *  context — e.g. "this month" or "No sections yet" — where the default
   *  green-up-arrow styling would misleadingly imply good news. Takes
   *  priority over deltaDirection when set. */
  deltaTone?: 'success' | 'warning' | 'muted';
  /** Makes the whole card a button — used for stats that are really a
   *  shortcut to the page that explains them (e.g. attendance coverage ->
   *  the attendance page), not just a static number. */
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  delta,
  deltaDirection = 'up',
  deltaTone,
  onClick,
}: StatCardProps) {
  const down = deltaDirection === 'down';
  const deltaClass = deltaTone
    ? deltaTone === 'success' ? 'bg-success-soft text-success'
      : deltaTone === 'warning' ? 'bg-warning-soft text-warning'
      : 'bg-muted text-muted-foreground'
    : down ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success';

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon size={20} />
        </div>
        {delta && (
          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium', deltaClass)}>
            {!deltaTone && (down ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />)}
            {delta}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'bg-card text-card-foreground rounded-2xl border border-border shadow-sm',
          'w-full p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 sm:p-5'
        )}
      >
        {content}
      </button>
    );
  }

  return <Card className="p-4 sm:p-5">{content}</Card>;
}
