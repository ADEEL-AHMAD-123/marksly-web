'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, ImageUp, Trash2, Upload, Lock, Info, CalendarDays, GraduationCap as GraduationCapIcon, Layers, Sparkles, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import {
  useGetMyInstitutionQuery,
  useUpdateMyInstitutionMutation,
  useUploadInstitutionLogoMutation,
  useRemoveInstitutionLogoMutation,
  type UpdateInstitutionProfileBody,
} from '@/store/api/institutionApi';
import { useGetTermsQuery } from '@/store/api/termsApi';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
// HEIC/HEIF included for iPhone photos of a physical stamp/signboard —
// matches upload.middleware.ts's server-side allow-list. Some mobile
// browsers report an empty/generic file.type for HEIC (inconsistent OS
// support), so this also falls back to the file extension, same as the
// backend does.
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;
const isAllowedImageFile = (file: File) => ALLOWED_TYPES.includes(file.type) || HEIC_EXTENSION_RE.test(file.name);

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  province: z.string().trim().max(80).optional().or(z.literal('')),
  contactEmail: z.string().trim().email('Invalid email').max(120),
  contactPhone: z.string().trim().min(6, 'Enter a valid phone number').max(20),
});
type ProfileForm = z.infer<typeof profileSchema>;

export function InstitutionProfileTab() {
  const { data, isLoading } = useGetMyInstitutionQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyInstitutionMutation();
  const [uploadLogo, { isLoading: uploading }] = useUploadInstitutionLogoMutation();
  const [removeLogo, { isLoading: removing }] = useRemoveInstitutionLogoMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inst = data?.data;

  const { register, reset, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (inst) {
      reset({
        name: inst.name,
        address: inst.address ?? '',
        city: inst.city ?? '',
        province: inst.province ?? '',
        contactEmail: inst.contactEmail,
        contactPhone: inst.contactPhone,
      });
    }
  }, [inst, reset]);

  const onSubmit = async (values: ProfileForm) => {
    try {
      await updateProfile({
        ...values,
        address: values.address || undefined,
        city: values.city || undefined,
        province: values.province || undefined,
      }).unwrap();
      toast.success('Institution profile updated');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not update profile');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    if (!isAllowedImageFile(file)) {
      toast.error('Logo must be a PNG, JPEG, WebP or HEIC image');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo must be under 2MB');
      return;
    }

    try {
      await uploadLogo(file).unwrap();
      toast.success('Logo uploaded — auto-cropped to a square for use on fee slips and receipts');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not upload logo');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo().unwrap();
      toast.success('Logo removed');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not remove logo');
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6"><Skeleton className="h-72 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="p-6 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg"><ImageUp size={18} className="text-primary" /> Logo</CardTitle>
          <CardDescription>
            Used on fee slips, payment receipts, and other documents parents receive. PNG, JPEG, WebP, or HEIC (iPhone photos), up to 2MB — automatically cropped and resized to a consistent square, no need to pre-crop it yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {inst?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inst.logoUrl} alt="Institution logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 size={28} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} /> {inst?.logoUrl ? 'Replace logo' : 'Upload logo'}
              </Button>
              {inst?.logoUrl && (
                <Button type="button" variant="ghost" size="sm" loading={removing} onClick={handleRemoveLogo} className="text-danger hover:bg-danger-soft">
                  <Trash2 size={14} /> Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg">Institution details</CardTitle>
          <CardDescription>Shown on fee slips, receipts, and messages sent to parents.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="name">Institution name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Input id="province" {...register('province')} />
              </div>
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" type="email" dir="ltr" {...register('contactEmail')} />
              {errors.contactEmail && <p className="mt-1 text-xs text-danger">{errors.contactEmail.message}</p>}
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" dir="ltr" {...register('contactPhone')} />
              {errors.contactPhone && <p className="mt-1 text-xs text-danger">{errors.contactPhone.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AcademicStructureCard />
    </div>
  );
}

type AcademicStructureValue = 'yearly' | 'semester' | 'short_session' | 'custom';

const STRUCTURE_OPTIONS: { value: AcademicStructureValue; icon: typeof CalendarDays; title: string; description: string }[] = [
  { value: 'yearly', icon: CalendarDays, title: 'Yearly', description: 'One academic year at a time — typical for K-12 schools.' },
  { value: 'semester', icon: GraduationCapIcon, title: 'Semester', description: '2-3 terms per year — typical for colleges and universities.' },
  { value: 'short_session', icon: Layers, title: 'Short Session', description: 'Flexible short courses — typical for academies and tuition centers.' },
  { value: 'custom', icon: Sparkles, title: 'Custom', description: 'Define your own term structure.' },
];

/** Lets the admin pick how this institution's academic calendar is
 *  structured — freely changeable until the very first Term is ever
 *  created, then permanently locked (backend throws ACADEMIC_STRUCTURE_LOCKED,
 *  see institution.service.ts). We derive "has any term ever existed" from
 *  useGetTermsQuery() returning a non-empty list — the backend doesn't
 *  expose a separate flag for this, and terms are never hard-deleted, so
 *  a non-empty list is an accurate, always-available signal. */
function AcademicStructureCard() {
  const { data, isLoading } = useGetMyInstitutionQuery();
  const { data: termsData, isLoading: termsLoading } = useGetTermsQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyInstitutionMutation();
  const inst = data?.data;
  const locked = (termsData?.data?.length ?? 0) > 0;
  const [pending, setPending] = useState<AcademicStructureValue | null>(null);

  if (isLoading || termsLoading) {
    return (
      <Card>
        <CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  const current = inst?.academicStructure;

  const handlePick = async (value: AcademicStructureValue) => {
    if (locked || value === current) return;
    setPending(value);
    try {
      const body: UpdateInstitutionProfileBody = { academicStructure: value };
      await updateProfile(body).unwrap();
      toast.success('Academic structure updated');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not update academic structure'));
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-lg">Academic structure</CardTitle>
        <CardDescription>
          Determines how {`terms/years/sessions`} are organized, and the language used across the app (e.g. "Class" vs "Course").
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {locked ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Lock size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">
                  {STRUCTURE_OPTIONS.find((o) => o.value === current)?.title ?? 'Custom'}
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Info size={12} /> Locked
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Locked once your first term is created — contact support if this needs to change.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STRUCTURE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = opt.value === current;
                const isSaving = pending === opt.value && saving;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onClick={() => handlePick(opt.value)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
                      active ? 'border-primary bg-primary-soft shadow-sm' : 'border-border hover:bg-muted'
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {opt.title}
                        {active && <Check size={14} className="text-primary" />}
                        {isSaving && <span className="text-xs font-normal text-muted-foreground">Saving…</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              You can change this freely until you create your first term — after that it's locked permanently.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
