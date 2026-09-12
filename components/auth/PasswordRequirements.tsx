'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shared with every screen that collects a new password under the same
// backend rule (register, reset, accept-invite, force-change) — see each
// validator's regex in auth.validator.ts. Previously only RegisterView gave
// live pass/fail feedback as you typed; the other three just let you submit
// and find out from a rejected-password error, which is a worse experience
// for exactly the same rule.
export function passwordRules(password: string) {
  return [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /[A-Z]/.test(password), label: 'Uppercase' },
    { ok: /[0-9]/.test(password), label: 'Number' },
  ];
}

export function PasswordRequirements({ password }: { password: string }) {
  const rules = passwordRules(password);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {rules.map((r) => (
        <span
          key={r.label}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
            r.ok ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
          )}
        >
          <Check size={11} className={r.ok ? 'opacity-100' : 'opacity-40'} />
          {r.label}
        </span>
      ))}
    </div>
  );
}
