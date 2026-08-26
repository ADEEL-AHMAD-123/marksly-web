'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useForgotPasswordMutation } from '@/store/api/authApi';

// Same country-aware PhoneInput as login/register, for the same reason —
// whatever's typed needs to normalize to E.164 the same way the stored
// account phone does, or the backend lookup silently finds nobody.
const schema = z.object({
  phone: z
    .string()
    .min(1, 'Enter a valid phone number')
    .refine((v) => isValidPhoneNumber(v), 'Enter a valid phone number'),
});
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = async (data: Form) => {
    setFormError(null);
    try {
      await forgotPassword({ phone: data.phone }).unwrap();
      // Deliberately doesn't reveal whether the account exists (the backend
      // returns the same generic success either way, see auth.service.ts's
      // forgotPassword()) — always proceed to the code-entry step.
      router.push(`/forgot-password/reset?phone=${encodeURIComponent(data.phone)}`);
    } catch (e: any) {
      setFormError(e?.data?.error?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your phone number and we&apos;ll send a reset code via SMS.
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
          <Label htmlFor="phone">Phone number</Label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id="phone"
                international
                labels={en}
                defaultCountry="PK"
                countryCallingCodeEditable={false}
                value={field.value}
                onChange={(v) => field.onChange(v ?? '')}
                placeholder="300 1234567"
                autoComplete="tel"
                autoFocus
                className={cn(errors.phone && 'PhoneInput-danger')}
              />
            )}
          />
          {errors.phone && <p className="mt-1.5 text-xs text-danger">{errors.phone.message}</p>}
        </div>

        <Button type="submit" loading={isLoading} className="w-full" size="lg">
          {isLoading ? 'Sending…' : 'Send reset code'}
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
