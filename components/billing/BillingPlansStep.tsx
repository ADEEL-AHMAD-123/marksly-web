'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, ShieldCheck, Clock, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

/* ── Step 2: plans — shown only when the admin asks to view/change plans ── */
export function PlansStep({
  plans, currentPlan, pendingPlan, scheduledPlan, selecting, onBack, onChoose,
}: {
  plans: { key: string; name: string; price: number; studentsLimit: number; storageGB: number; features: string[] }[];
  currentPlan: string;
  pendingPlan: string | null;
  scheduledPlan: string | null;
  selecting: boolean;
  onBack: () => void;
  onChoose: (planKey: string) => void;
}) {
  // `selecting` is one shared mutation-loading flag for the whole step —
  // applying it directly to every card's button made all of them spin at
  // once regardless of which plan was actually clicked. Track which key was
  // clicked locally so only that one card shows a spinner; the rest are
  // just disabled (not spinning) while the request is in flight.
  const [clickingKey, setClickingKey] = useState<string | null>(null);
  const handleChoose = (key: string) => {
    setClickingKey(key);
    onChoose(key);
  };
  // Once the mutation settles (success or error), `selecting` goes back to
  // false — clear the local key too so a later click on the SAME plan (e.g.
  // retrying after an error) shows its spinner again instead of staying
  // stuck referencing a finished request.
  useEffect(() => {
    if (!selecting) setClickingKey(null);
  }, [selecting]);

  const mostExpensive = plans.reduce((max, p) => (p.price > max ? p.price : max), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <CardTitle className="flex items-center gap-2"><Sparkles size={18} /> Choose your plan</CardTitle>
            <CardDescription>Pick the plan that fits your institution — you can change it any time.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No plans available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const current = p.key === currentPlan;
              const pending = p.key === pendingPlan;
              const scheduled = p.key === scheduledPlan;
              const recommended = !current && !pending && !scheduled && p.price > 0 && p.price === mostExpensive && plans.length > 1;
              return (
                <div
                  key={p.key}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-5 shadow-sm transition-all',
                    current ? 'border-primary bg-primary-soft/40'
                      : pending ? 'border-warning bg-warning-soft/40'
                      : scheduled ? 'border-border bg-muted/40'
                      : recommended ? 'border-primary/50 hover:-translate-y-0.5 hover:shadow-md'
                      : 'border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'
                  )}
                >
                  {recommended && (
                    <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Best value
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    {current && <Badge variant="primary"><ShieldCheck size={11} /> Current</Badge>}
                    {pending && <Badge variant="warning"><Clock size={11} /> Pending</Badge>}
                    {scheduled && <Badge variant="neutral"><Clock size={11} /> Scheduled</Badge>}
                  </div>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                    {p.price > 0 ? formatCurrency(p.price) : 'Free'}
                    {p.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                  </p>
                  <div className="my-4 h-px bg-border" />
                  <ul className="flex-1 space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-success" /> Up to {p.studentsLimit.toLocaleString('en-PK')} students</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-success" /> {p.storageGB} GB storage</li>
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 capitalize"><Check size={13} className="text-success" /> {f}</li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5"
                    variant={current || pending || scheduled ? 'secondary' : 'primary'}
                    disabled={current || (selecting && clickingKey !== p.key)}
                    loading={selecting && clickingKey === p.key}
                    onClick={() => handleChoose(p.key)}
                  >
                    {current ? 'Current plan' : pending ? 'Selected — pay to activate' : scheduled ? 'Scheduled — choose again' : 'Choose plan'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
