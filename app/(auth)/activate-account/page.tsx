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
import { useAcceptInviteMutation } from '@/store/api/authApi';
import { getErrorMessage } from '@/lib/get-error-message';

// Same password rule used everywhere else (register, reset-password).
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[0-9]/, 'Add a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof schema>;

function ActivateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [acceptInvite, { isLoading }] = useAcceptInviteMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = async (data: Form) => {
    setFormError(null);
    if (!token) {
      setFormError('Missing activation link — ask whoever added you to resend it.');
      return;
    }
    try {
      await acceptInvite({ token, password: data.password }).unwrap();
      setDone(true);
      setTimeout(() => router.push('/login'), 1800);
    } catch (e: any) {
      setFormError(getErrorMessage(e, 'This activation link is invalid or has expired — ask whoever added you to resend it.'));
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Invalid activation link</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          This link is missing its activation token. Ask whoever added you to Marksly to resend the invite.
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

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account activated</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Set up your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose a password to finish activating your Marksly account.
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
          <Label htmlFor="password">Password</Label>
          <input
            id="password"
            {...register('password')}
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            className={cn(
              'h-11 w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.password ? 'border-danger' : 'border-input'
            )}
          />
          {errors.password && <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>}
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
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-danger">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" loading={isLoading} className="w-full" size="lg">
          {isLoading ? 'Activating…' : 'Activate account'}
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

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={null}>
      <ActivateAccountForm />
    </Suspense>
  );
}
