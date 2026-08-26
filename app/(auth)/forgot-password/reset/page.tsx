'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, CheckCircle2, Building2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useResetPasswordMutation } from '@/store/api/authApi';
import { getErrorMessage, getErrorCode, getErrorDetails } from '@/lib/get-error-message';

// Same phone-shared-across-institutions ambiguity as login (see that
// page's comment) — resetPassword() can return this once the OTP itself
// has already proven phone ownership, asking which institution's password
// this reset applies to instead of guessing.
interface AmbiguousAccountOption {
  institutionId: string;
  institutionName: string;
  role: string;
}

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
  const [accountOptions, setAccountOptions] = useState<AmbiguousAccountOption[] | null>(null);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const completeReset = async (data: { otp: string; newPassword: string; institutionId?: string }) => {
    await resetPassword({ phone, otp: data.otp, newPassword: data.newPassword, institutionId: data.institutionId }).unwrap();
    setDone(true);
    setTimeout(() => router.push('/login'), 1800);
  };

  const onSubmit = async (data: Form) => {
    setFormError(null);
    setAccountOptions(null);
    if (!phone) {
      setFormError('Missing phone number — please start over.');
      return;
    }
    try {
      await completeReset(data);
    } catch (e: any) {
      if (getErrorCode(e) === 'MULTIPLE_ACCOUNTS') {
        const details = getErrorDetails<{ institutions: AmbiguousAccountOption[] }>(e);
        if (details?.institutions?.length) {
          setAccountOptions(details.institutions);
          return;
        }
      }
      setFormError(getErrorMessage(e, 'That code is invalid or has expired. Please request a new one.'));
    }
  };

  const onSelectInstitution = async (institutionId: string) => {
    setFormError(null);
    try {
      await completeReset({ ...getValues(), institutionId });
    } catch (e: any) {
      setAccountOptions(null);
      setFormError(getErrorMessage(e, 'That code is invalid or has expired. Please request a new one.'));
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

  if (accountOptions) {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Which institution?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This phone number is linked to more than one institution. Pick the one you're resetting the password for.
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

        <div className="space-y-2">
          {accountOptions.map((opt) => (
            <button
              key={opt.institutionId}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectInstitution(opt.institutionId)}
              className="flex w-full items-center gap-3 rounded-lg border border-input bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Building2 size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{opt.institutionName}</span>
                <span className="block text-xs capitalize text-muted-foreground">{opt.role}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAccountOptions(null)}
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Back
        </button>
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
