'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useResetPasswordMutation } from '@/store/api/authApi';

// Password rule matches register/page.tsx's schema for consistency.
const schema = z
  .object({
    otp: z.string().min(4, 'Enter the code we sent you'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[0-9]/, 'Add a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = async (data: Form) => {
    setFormError(null);
    if (!phone) {
      setFormError('Missing phone number — please start over.');
      return;
    }
    try {
      await resetPassword({ phone, otp: data.otp, newPassword: data.newPassword }).unwrap();
      setDone(true);
      setTimeout(() => router.push('/login'), 1800);
    } catch (e: any) {
      setFormError(e?.data?.error?.message || 'Invalid or expired code. Please try again.');
    }
  };

  if (!phone) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Session expired</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          We couldn&apos;t find a phone number for this reset. Please start over.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={15} /> Back to forgot password
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Password updated</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Enter reset code</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a code via SMS to <span className="font-medium text-foreground" dir="ltr">{phone}</span>.
          Enter it below with your new password.
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
          <Label htmlFor="otp">Reset code</Label>
          <input
            id="otp"
            {...register('otp')}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            dir="ltr"
            placeholder="123456"
            aria-invalid={!!errors.otp}
            className={cn(
              'h-11 w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.otp ? 'border-danger' : 'border-input'
            )}
          />
          {errors.otp && <p className="mt-1.5 text-xs text-danger">{errors.otp.message}</p>}
        </div>

        <div>
          <Label htmlFor="newPassword">New password</Label>
          <input
            id="newPassword"
            {...register('newPassword')}
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            className={cn(
              'h-11 w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.newPassword ? 'border-danger' : 'border-input'
            )}
          />
          {errors.newPassword && (
            <p className="mt-1.5 text-xs text-danger">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <input
            id="confirmPassword"
            {...register('confirmPassword')}
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className={cn(
              'h-11 w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.confirmPassword ? 'border-danger' : 'border-input'
            )}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-danger">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" loading={isLoading} className="w-full" size="lg">
          {isLoading ? 'Resetting…' : 'Reset password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
