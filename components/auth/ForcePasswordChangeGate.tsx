'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateUser } from '@/store/slices/authSlice';
import { useChangePasswordMutation, useUpdateProfileMutation } from '@/store/api/authApi';
import { Logo } from '@/components/brand/Logo';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[0-9]/, 'Add a number'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type PasswordForm = z.infer<typeof passwordSchema>;

// Same leniency as SettingsView's ProfileTab — an admin who typed this
// person's details into a form (or a bulk-import CSV) may have left a
// legacy local-format number sitting here; only hard-fail once they've
// actually typed something new, not on whatever was pre-filled.
const detailsSchema = z.object({
  firstName: z.string().trim().min(1, 'Required'),
  lastName: z.string().trim().min(1, 'Required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .refine((v) => !v.startsWith('+') || isValidPhoneNumber(v), 'Enter a valid phone number'),
});
type DetailsForm = z.infer<typeof detailsSchema>;

/**
 * Step 1 of the first-login gate — someone ELSE (an admin/accountant)
 * typed this account into existence, whether by hand or via a bulk-import
 * spreadsheet, so there's a real chance a name got misspelled or a digit
 * got transposed in the phone/email column with nobody who'd notice at
 * the time. Shown before the password step (not after) specifically
 * because the password step is what flips `mustChangePassword` to false
 * server-side — if this ran second and the person refreshed mid-flow,
 * they'd land straight in the dashboard having skipped it entirely.
 */
function VerifyDetailsStep({ onDone }: { onDone: () => void }) {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = async (values: DetailsForm) => {
    try {
      const res = await updateProfile(values).unwrap();
      dispatch(updateUser(res.data));
      onDone();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save your details');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo className="mb-2" />
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <ShieldCheck size={18} />
        </span>
        <CardTitle>Double-check your details</CardTitle>
        <CardDescription>
          {user?.firstName ? `Hi ${user.firstName}, ` : ''}your account was set up by someone at your
          institution. Please make sure everything below is correct — fix anything that isn&apos;t
          before continuing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="mt-1 text-xs text-danger">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="mt-1 text-xs text-danger">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  international
                  labels={en}
                  defaultCountry="PK"
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  className={cn(errors.phone && 'PhoneInput-danger')}
                />
              )}
            />
            {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" dir="ltr" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isLoading}>
            This is all correct — continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SetPasswordStep() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordForm) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      dispatch(updateUser({ mustChangePassword: false }));
      toast.success('Password updated — welcome to Marksly.');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not change password');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo className="mb-2" />
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <KeyRound size={18} />
        </span>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          {user?.firstName ? `Hi ${user.firstName}, ` : ''}your account was created with a temporary
          password. Set your own before continuing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Temporary password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-danger">{errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
            {errors.newPassword && <p className="mt-1 text-xs text-danger">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
            {errors.confirm && <p className="mt-1 text-xs text-danger">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isLoading}>
            Set password &amp; continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Blocks the entire dashboard behind two mandatory steps for accounts
 * still on an auto-generated temporary password (i.e. created by someone
 * else — an admin/accountant, one at a time or via bulk import): first
 * review/correct the profile details that person typed in on their
 * behalf, then set a real password. Rendered by the dashboard layout
 * whenever `user.mustChangePassword` is true — nothing else in the app is
 * reachable until both steps succeed.
 */
export function ForcePasswordChangeGate() {
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {detailsConfirmed ? (
        <SetPasswordStep />
      ) : (
        <VerifyDetailsStep onDone={() => setDetailsConfirmed(true)} />
      )}
    </div>
  );
}
