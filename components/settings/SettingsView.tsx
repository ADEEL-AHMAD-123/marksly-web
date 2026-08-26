'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Check, Palette, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateUser } from '@/store/slices/authSlice';
import { useUpdateProfileMutation, useChangePasswordMutation } from '@/store/api/authApi';
import { useGetBankDetailsQuery, useUpdateBankDetailsMutation } from '@/store/api/superadminApi';
import { useTheme } from '@/components/theme/ThemeProvider';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { InstitutionProfileTab } from './InstitutionProfileTab';

export function SettingsView() {
  const { user } = useAppSelector((s) => s.auth);
  const isSuperadmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="institution">Institution &amp; Branding</TabsTrigger>}
          <TabsTrigger value="security">Security</TabsTrigger>
          {isSuperadmin && <TabsTrigger value="billing">Billing</TabsTrigger>}
          {isSuperadmin && <TabsTrigger value="appearance">Appearance</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        {isAdmin && <TabsContent value="institution"><InstitutionProfileTab /></TabsContent>}
        <TabsContent value="security"><SecurityTab /></TabsContent>
        {isSuperadmin && <TabsContent value="billing"><BillingTab /></TabsContent>}
        {isSuperadmin && <TabsContent value="appearance"><AppearanceTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

/* ── Profile ───────────────────────────────────────────────────────────────── */
const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  // Accounts created before the country-aware phone input (see
  // register/page.tsx) may still hold a legacy local-format number here —
  // don't hard-fail validation on those until the person actually edits
  // this field; only re-validate strictly once they've typed a new value.
  phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .refine((v) => !v.startsWith('+') || isValidPhoneNumber(v), 'Enter a valid phone number'),
});
type ProfileForm = z.infer<typeof profileSchema>;

function ProfileTab() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const { register, control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = async (values: ProfileForm) => {
    try {
      const res = await updateProfile({ ...values, email: values.email || undefined }).unwrap();
      dispatch(updateUser(res.data));
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not update profile');
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
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
          <div className="flex justify-end">
            <Button type="submit" loading={isLoading}>Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Security ──────────────────────────────────────────────────────────────── */
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[0-9]/, 'Add a number'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type PasswordForm = z.infer<typeof passwordSchema>;

function SecurityTab() {
  const dispatch = useAppDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (values: PasswordForm) => {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap();
      dispatch(updateUser({ mustChangePassword: false }));
      toast.success('Password changed');
      reset();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not change password');
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Use at least 8 characters with an uppercase letter and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="mt-1 text-xs text-danger">{errors.currentPassword.message}</p>}
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
          <div className="flex justify-end">
            <Button type="submit" loading={isLoading}>Update password</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Billing — platform bank details (super admin) ───────────────────────────
   Shown to every institution on their "Pay by bank transfer" screen — edited
   here instead of an env var, so switching banks or fixing a typo doesn't
   need a redeploy. */
function BillingTab() {
  const { data, isLoading } = useGetBankDetailsQuery();
  const [updateBankDetails, { isLoading: saving }] = useUpdateBankDetailsMutation();
  const { register, handleSubmit, reset } = useForm<{ bankName: string; bankAccountTitle: string; bankIban: string }>({
    defaultValues: { bankName: '', bankAccountTitle: '', bankIban: '' },
  });

  useEffect(() => {
    if (data?.data) reset(data.data);
  }, [data, reset]);

  const onSubmit = async (values: { bankName: string; bankAccountTitle: string; bankIban: string }) => {
    try {
      await updateBankDetails(values).unwrap();
      toast.success('Bank details updated');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not update bank details');
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Landmark size={18} /> Bank transfer details</CardTitle>
        <CardDescription>Shown to institutions when they choose to pay by bank transfer instead of online.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" placeholder="e.g. Meezan Bank" {...register('bankName')} />
            </div>
            <div>
              <Label htmlFor="bankAccountTitle">Account title</Label>
              <Input id="bankAccountTitle" placeholder="e.g. Marksly (Pvt) Ltd" {...register('bankAccountTitle')} />
            </div>
            <div>
              <Label htmlFor="bankIban">IBAN</Label>
              <Input id="bankIban" dir="ltr" placeholder="PK00XXXX0000000000000000" {...register('bankIban')} />
            </div>
            <p className="text-xs text-muted-foreground">
              The IBAN is what institutions actually need to pay — until it's set, they'll see a
              "contact support for transfer details" message instead of the bank transfer option.
            </p>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Appearance (super admin) ──────────────────────────────────────────────── */
function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette size={18} /> Theme</CardTitle>
        <CardDescription>Choose the color theme for the whole platform. Applies to everyone.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  active ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted'
                )}
              >
                <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-border" style={{ background: t.swatch }} />
                <span className="flex-1 text-sm font-medium text-foreground">{t.name}</span>
                {active && <Check size={16} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
