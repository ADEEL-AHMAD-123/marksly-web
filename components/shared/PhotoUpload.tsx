'use client';

import { useRef, useState } from 'react';
import { User as UserIcon, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUploadUserPhotoMutation, useRemoveUserPhotoMutation } from '@/store/api/usersApi';

// Same limits/allow-list as InstitutionProfileTab.tsx's logo upload — the
// backend applies its own (larger, server-side) limits too, this is just
// fast client-side feedback before a request is even made.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface PhotoUploadProps {
  userId: string;
  photoUrl?: string | null;
  /** Shown in the placeholder avatar when there's no photo yet. */
  initials?: string;
  size?: 'md' | 'lg';
  className?: string;
}

/** Circular avatar with click/drag-to-upload and a remove button — the
 *  shared control for any User's profile photo (student, teacher, staff,
 *  accountant, admin), mirroring InstitutionProfileTab.tsx's logo-upload UX
 *  but backed by the per-user photo endpoints instead of the institution
 *  logo one. */
export function PhotoUpload({ userId, photoUrl, initials, size = 'lg', className }: PhotoUploadProps) {
  const [uploadPhoto, { isLoading: uploading }] = useUploadUserPhotoMutation();
  const [removePhoto, { isLoading: removing }] = useRemoveUserPhotoMutation();
  const [localPhoto, setLocalPhoto] = useState<string | null | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // localPhoto (set right after a successful upload/remove) takes priority
  // over the photoUrl prop — the parent list/detail query this came from
  // may not refetch a fresh profilePhoto immediately (or, for students,
  // never includes it in the list response at all), so this is the only
  // reliable way to reflect the change without a manual reload.
  const currentPhoto = localPhoto !== undefined ? localPhoto : photoUrl ?? null;
  const busy = uploading || removing;
  const dims = size === 'lg' ? 'h-24 w-24' : 'h-16 w-16';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Photo must be a PNG, JPEG, or WebP image');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be under 2MB');
      return;
    }
    try {
      const res = await uploadPhoto({ userId, file }).unwrap();
      setLocalPhoto(res.data.profilePhoto);
      toast.success('Photo uploaded');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not upload photo');
    }
  };

  const handleRemove = async () => {
    try {
      await removePhoto({ userId }).unwrap();
      setLocalPhoto(null);
      toast.success('Photo removed');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not remove photo');
    }
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-full border border-border bg-muted transition-colors',
          dims,
          dragOver && 'border-primary ring-2 ring-primary/30'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {currentPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentPhoto} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {initials ? (
              <span className="text-sm font-semibold">{initials}</span>
            ) : (
              <UserIcon size={size === 'lg' ? 28 : 20} />
            )}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} /> {currentPhoto ? 'Replace photo' : 'Upload photo'}
        </Button>
        {currentPhoto && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={removing}
            disabled={busy}
            onClick={handleRemove}
            className="text-danger hover:bg-danger-soft"
          >
            <Trash2 size={14} /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
