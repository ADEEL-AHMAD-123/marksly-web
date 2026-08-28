'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, ImageUp, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetMyInstitutionQuery,
  useUpdateMyInstitutionMutation,
  useUploadInstitutionLogoMutation,
  useRemoveInstitutionLogoMutation,
} from '@/store/api/institutionApi';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Logo must be a PNG, JPEG, or WebP image');
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
            Used on fee slips, payment receipts, and other documents parents receive. PNG, JPEG, or WebP, up to 2MB — automatically cropped and resized to a consistent square, no need to pre-crop it yourself.
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
                accept="image/png,image/jpeg,image/webp"
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
    </div>
  );
}
