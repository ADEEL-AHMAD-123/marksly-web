'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  tempPassword: string;
  /** True when we already emailed these credentials to the person (so the
   *  copy says "also emailed" instead of implying it's the only record). */
  emailed?: boolean;
}

/**
 * Shown exactly once, right after creating a student/teacher/staff account
 * with an auto-generated temporary password — the API only ever returns the
 * plaintext password in the create response, never again (see
 * student.service.ts / user.service.ts create()). If this dialog is
 * dismissed without copying it down, the only other way to see it is the
 * welcome email (when the account has an email on file) or a manual
 * password reset.
 */
export function TempPasswordDialog({ open, onClose, name, phone, tempPassword, emailed }: Props) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(`Phone: ${phone}\nPassword: ${tempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (non-secure context, permissions) —
      // the credentials are still visible on screen to copy manually.
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <KeyRound size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">{name}&apos;s login was created</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            Save this password now — it{"'"}s only shown once and can&apos;t be retrieved later.
            {emailed ? ' It was also emailed to them.' : ' They’ll be asked to set their own on first login.'}
          </DialogPrimitive.Description>

          <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/50 p-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span dir="ltr" className="font-medium">{phone}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Password</span>
              <span dir="ltr" className="font-mono font-semibold tracking-wide">{tempPassword}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={copyAll}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
