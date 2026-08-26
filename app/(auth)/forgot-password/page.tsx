'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useForgotPasswordMutation } from '@/store/api/authApi';
import { getErrorMessage } from '@/lib/get-error-message';

// Password reset is email-based, not phone/SMS — see auth.service.ts's
// forgotPassword() comment: there was never an actual SMS provider wired
// up behind the old OTP flow, so it was silently non-functional for real
// users. Email reuses the already-working Resend infrastructure (the same
// one that sends the verification email).
const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = async (data: Form) => {
    setFormError(null);
    try {
      await forgotPassword({ email: data.email }).unwrap();
      // Deliberately doesn't reveal whether the account exists (the backend
      // returns the same generic success either way, see auth.service.ts's
      // forgotPassword()) — always show the same "check your email" screen.
      setSentTo(data.email);
      setSent(true);
    } catch (e: any) {
      setFormError(getErrorMessage(e, 'Could not send the reset link. Please try again.'));
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <MailCheck size={26} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve sent a
          password reset link. It expires in 1 hour and can only be used once.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="email"
              {...register('email')}
              type="email"
              autoComplete="email"
              autoFocus
              dir="ltr"
              placeholder="you@institute.pk"
              aria-invalid={!!errors.email}
              className={cn(
                'h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                errors.email ? 'border-danger' : 'border-input'
              )}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
        </div>

        <Button type="submit" loading={isLoading} className="w-full" size="lg">
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </div>
  );
}
