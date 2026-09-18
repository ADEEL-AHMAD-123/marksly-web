'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Printer, CreditCard as IdCardIcon, Loader2, MapPin, Camera, X, RotateCw, Download,
  KeyRound, Info, Pencil,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { Avatar } from '@/components/ui/avatar';
import { useAppSelector } from '@/store/hooks';
import { getErrorMessage } from '@/lib/get-error-message';
import {
  useGetMyCardQuery,
  useUpdateMyContactMutation,
  useUploadMyPhotoMutation,
  useRemoveMyPhotoMutation,
} from '@/store/api/usersApi';
import { useGetMyStudentCardQuery, useUpdateMyStudentContactMutation, useChangeMyPinMutation } from '@/store/api/studentsApi';
import {
  idCardFieldLabel, SELF_FIXABLE_MISSING_KEYS, staffCardMissingKeys, studentCardMissingKeys,
  cardBlockingMissingKeys, REQUIRED_CARD_KEYS,
} from '@/lib/id-card-missing';
import { IdCardMissingFieldsBanner, type IdCardMissingFieldItem } from '@/components/shared/IdCardMissingFieldsBanner';
import { ID_CARD_PRINT_CSS } from '@/components/shared/idCardPrint';
import { IdCardBack } from '@/components/shared/IdCardBack';
import { PhotoCropModal } from '@/components/shared/PhotoCropModal';
import { StaffIdCardItem, staffBackRows } from '@/components/staff/StaffIdCardsView';
import { IdCardItem, studentBackRows } from '@/components/students/IdCardsView';
import { cn, formatNationalId } from '@/lib/utils';
import { useTerminology, nationalIdLabelForInstitutionType, officeLabelForInstitutionType } from '@/lib/terminology';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Shared dialog chrome — same header/body/footer shape as the admin-facing
// EditCardDetailsDialog, so a self-service edit dialog and an admin edit
// dialog feel like the same product instead of two different ideas of what
// a form looks like.
/** Before/after review shown right before a self-service edit is saved —
 *  so "Save" never silently commits a typo or an accidental blank; the
 *  person sees exactly what's about to change and can back out. Only
 *  fields that actually changed are listed. */
interface FieldChange { label: string; before: string; after: string }

function ChangeSummary({ changes }: { changes: FieldChange[] }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      {changes.map((c) => (
        <div key={c.label} className="flex items-start justify-between gap-3 text-sm">
          <span className="shrink-0 text-muted-foreground">{c.label}</span>
          <span className="text-right font-medium text-foreground">
            {c.before && <span className="mr-1 text-muted-foreground line-through">{c.before}</span>}
            {c.after || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function FormDialog({
  open, onClose, icon: Icon, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
              <Icon size={16} className="text-primary" /> {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4 space-y-3">{children}</div>
          <div className="mt-5 flex items-center justify-end gap-2">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * A single circular control for the profile photo — avatar with a small
 * camera badge to change it and, when a photo exists, a small remove badge
 * in the opposite corner. Replaces the old full-width "photo" Card: the
 * photo is one small, self-contained action, not a whole section of the
 * page competing with everything else for attention.
 */
function PhotoAvatarControl({ photoUrl, initials }: { photoUrl: string | null | undefined; initials: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading: uploading }] = useUploadMyPhotoMutation();
  const [remove, { isLoading: removing }] = useRemoveMyPhotoMutation();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const busy = uploading || removing;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, or WEBP image');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be under 2MB');
      return;
    }
    setPendingFile(file);
  };

  const handleCropped = async (cropped: File) => {
    setPendingFile(null);
    try {
      await upload({ file: cropped }).unwrap();
      toast.success(photoUrl ? 'Photo updated' : 'Photo added — your card now shows it');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not upload photo'));
    }
  };

  const handleRemove = async () => {
    try {
      await remove().unwrap();
      toast.success('Photo removed');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not remove photo'));
    }
  };

  return (
    <>
      <PhotoCropModal open={!!pendingFile} file={pendingFile} onClose={() => setPendingFile(null)} onCropped={handleCropped} />
      <div className="relative shrink-0">
        <Avatar photoUrl={photoUrl} alt="" initials={initials} size="lg" />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // See the original uploader's note: a browser <input
            // type="file"> won't re-fire onChange for the same file path
            // unless its value is cleared first.
            e.target.value = '';
            handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title={photoUrl ? 'Change photo' : 'Add photo'}
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 disabled:opacity-60 no-print"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        </button>
        {photoUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            title="Remove photo"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground shadow-sm transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60 no-print"
          >
            {removing ? <Loader2 size={9} className="animate-spin" /> : <X size={10} />}
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Informational (non-blocking) line for any `card.missing` key we don't have
 * a self-service fix-it input for — i.e. anything other than 'address'/
 * 'bloodGroup'. The backend's getMyCard endpoints today only ever push
 * those two keys (see student.service.ts/user.service.ts), so in practice
 * this rarely renders, but it exists so a future/admin-only key never
 * silently disappears with no explanation.
 */
function AdminOnlyMissingNote({ keys }: { keys: string[] }) {
  if (keys.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info size={14} className="mt-0.5 shrink-0" />
      <p>
        Ask your school&apos;s office to add your {keys.map((k) => idCardFieldLabel(k)).join(', ')} —
        this isn&apos;t something you can update yourself.
      </p>
    </div>
  );
}

/**
 * Self-service "My ID Card" page — for every role except superadmin/parent
 * (see SidebarNav.tsx for the nav-link gating; admin gets this page too,
 * same as teacher/staff/accountant). Shows a one-time setup gate until the
 * account's own required fields are filled in (same "no card before
 * complete info" principle as the admin bulk views), then a two-column
 * layout: a compact profile panel (photo, quick actions) beside the actual
 * printable card, which stays the visual focus of the page instead of
 * competing for space with a stack of edit forms above it.
 */
export function MyIdCardView() {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role;

  if (role === 'student') return <StudentMyIdCard />;
  if (role === 'teacher' || role === 'staff' || role === 'accountant' || role === 'admin') {
    return <StaffMyIdCard />;
  }
  return (
    <div className="space-y-6">
      <PageHeader title="My ID Card" description="Your printable identity card." />
      <Card><EmptyState icon={IdCardIcon} title="Not available for this account" description="This account type doesn't have its own ID card." /></Card>
    </div>
  );
}

/** Self-service "edit my details" dialog for staff — address and CNIC only;
 *  designation/joining date stay admin-managed (see user.validator.ts's
 *  updateMyContactSchema, which only ever accepts phone/address/nationalId
 *  for self-service). Opened from the profile panel's "Edit my details"
 *  button, not shown inline, so it doesn't push the rest of the page
 *  around while closed. */
function EditMyStaffDetailsDialog({
  open, onClose, currentAddress, currentNationalId, currentPhone,
}: {
  open: boolean; onClose: () => void;
  currentAddress: string | null; currentNationalId: string | null; currentPhone: string | null;
}) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [address, setAddress] = useState(currentAddress ?? '');
  const [nationalId, setNationalId] = useState(currentNationalId ?? '');
  const [phone, setPhone] = useState(currentPhone ?? '');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [updateContact, { isLoading: saving }] = useUpdateMyContactMutation();

  // Re-seed the form from the latest server values every time it opens —
  // otherwise a second open after Cancel would show whatever was typed
  // (and abandoned) the first time instead of what's actually saved.
  useEffect(() => {
    if (open) {
      setStep('edit');
      setAddress(currentAddress ?? '');
      setNationalId(currentNationalId ?? '');
      setPhone(currentPhone ?? '');
      setNationalIdError(null);
    }
  }, [open, currentAddress, currentNationalId, currentPhone]);

  const changes: FieldChange[] = [
    { label: 'Address', before: currentAddress ?? '', after: address.trim() },
    { label: 'Phone', before: currentPhone ?? '', after: phone.trim() },
    { label: 'CNIC Number', before: currentNationalId ?? '', after: nationalId },
  ].filter((c) => c.before !== c.after);

  const handleReview = () => {
    if (nationalId && !/^\d{5}-\d{7}-\d$/.test(nationalId)) {
      setNationalIdError('Enter a valid CNIC in the format 42101-1234567-1');
      return;
    }
    if (changes.length === 0) {
      toast('No changes to save');
      onClose();
      return;
    }
    setStep('confirm');
  };

  const onConfirm = async () => {
    try {
      await updateContact({
        address: address.trim(),
        phone: phone.trim() || undefined,
        nationalIdNumber: nationalId || undefined,
      }).unwrap();
      toast.success('Details saved');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save your details'));
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      icon={step === 'confirm' ? Pencil : MapPin}
      title={step === 'confirm' ? 'Review your changes' : 'Edit my details'}
      footer={
        step === 'confirm' ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setStep('edit')}>Back</Button>
            <Button size="sm" loading={saving} onClick={onConfirm}>Confirm & save</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleReview}>Review changes</Button>
          </>
        )
      }
    >
      {step === 'confirm' ? (
        <>
          <p className="text-sm text-muted-foreground">This is what will change on your profile and ID card:</p>
          <ChangeSummary changes={changes} />
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="edit-my-address">Address</Label>
            <Input id="edit-my-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
          </div>
          <div>
            <Label htmlFor="edit-my-phone">Phone</Label>
            <Input id="edit-my-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xxxxxxxxx" />
          </div>
          <div>
            <Label htmlFor="edit-my-nid">CNIC Number</Label>
            <Input
              id="edit-my-nid"
              dir="ltr"
              placeholder="42101-1234567-1"
              inputMode="numeric"
              value={nationalId}
              onChange={(e) => { setNationalId(formatNationalId(e.target.value)); setNationalIdError(null); }}
            />
            {nationalIdError && <p className="mt-1 text-xs text-danger">{nationalIdError}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Designation and joining date are managed by your school — ask your admin to update those.
          </p>
        </>
      )}
    </FormDialog>
  );
}

function StaffMyIdCard() {
  const { data, isFetching, isError } = useGetMyCardQuery();
  const card = data?.data;
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [updateContact, { isLoading: saving }] = useUpdateMyContactMutation();
  const [showBack, setShowBack] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const missing = card?.missing ?? [];
  const fixableMissing = missing.filter((k) => SELF_FIXABLE_MISSING_KEYS.has(k));
  const adminOnlyMissing = missing.filter((k) => !SELF_FIXABLE_MISSING_KEYS.has(k));
  // Only block the card when there's something the person themselves can
  // still fix — admin-only fields (if the backend ever sends any) shouldn't
  // permanently hide someone's card, so those just get an informational
  // note alongside the normal card below.
  const blocked = fixableMissing.length > 0;
  const needsAddress = fixableMissing.includes('address');
  const needsNationalId = fixableMissing.includes('nationalId');

  const handleDownload = async () => {
    if (!frontRef.current || !card) return;
    setDownloading(true);
    try {
      const { downloadCardPdf, cardFileName } = await import('@/components/shared/cardDownload');
      await downloadCardPdf({
        frontEl: frontRef.current,
        backEl: backRef.current,
        fileName: cardFileName(card.name, 'staff-id-card'),
      });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not generate the PDF'));
    } finally {
      setDownloading(false);
    }
  };

  const initials = card ? card.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '';

  // Same "photo + national ID are required to issue, everything else is
  // optional" rule the admin ID card views enforce (see lib/id-card-
  // missing.ts) — computed the same way here so a self-printed card can
  // never be more lenient than what an admin printing it on someone's
  // behalf would allow.
  const staffSettings = card?.institution?.settings?.idCard;
  const staffMissingKeys = card ? staffCardMissingKeys(card, staffSettings) : [];
  const staffMissingItems: IdCardMissingFieldItem[] = staffMissingKeys.map((key) => ({
    key,
    label: idCardFieldLabel(key, 'CNIC'),
    required: REQUIRED_CARD_KEYS.has(key),
    action: SELF_FIXABLE_MISSING_KEYS.has(key)
      ? { type: 'cardDetails', onClick: () => setEditOpen(true) }
      : { type: 'none' },
  }));
  const canIssue = cardBlockingMissingKeys(staffMissingKeys).length === 0;

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />
      <PageHeader title="My ID Card" description="Your printable staff identity card." />

      {isFetching ? (
        <Card className="p-5 no-print"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : isError || !card ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Couldn't load your card" description="Try refreshing the page." /></Card>
      ) : blocked ? (
        <Card className="mx-auto max-w-sm space-y-4 p-5 no-print">
          <div className="flex items-center gap-3">
            <PhotoAvatarControl photoUrl={card.photoMissing ? null : card.profilePhoto ?? null} initials={initials} />
            <div>
              <p className="text-sm font-semibold text-foreground">One more thing before your card is ready</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {fixableMissing.length === 1 ? 'One field is' : 'A couple of fields are'} missing below.
              </p>
            </div>
          </div>
          {needsAddress && (
            <div>
              <Label htmlFor="my-address">Address</Label>
              <Input id="my-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
            </div>
          )}
          {needsNationalId && (
            <div>
              <Label htmlFor="my-nid">CNIC Number</Label>
              <Input
                id="my-nid"
                dir="ltr"
                placeholder="42101-1234567-1"
                inputMode="numeric"
                value={nationalId}
                onChange={(e) => { setNationalId(formatNationalId(e.target.value)); setNationalIdError(null); }}
              />
              {nationalIdError && <p className="mt-1 text-xs text-danger">{nationalIdError}</p>}
            </div>
          )}
          <Button
            size="sm"
            disabled={(needsAddress && !address.trim()) || (needsNationalId && !nationalId.trim()) || saving}
            onClick={async () => {
              if (needsNationalId && !/^\d{5}-\d{7}-\d$/.test(nationalId)) {
                setNationalIdError('Enter a valid CNIC in the format 42101-1234567-1');
                return;
              }
              try {
                await updateContact({
                  ...(needsAddress ? { address: address.trim() } : {}),
                  ...(needsNationalId ? { nationalIdNumber: nationalId } : {}),
                }).unwrap();
                toast.success('Saved — your card is ready');
              } catch (e) {
                toast.error(getErrorMessage(e, 'Could not save your details'));
              }
            }}
          >
            {saving ? 'Saving…' : 'Save & show my card'}
          </Button>
          <AdminOnlyMissingNote keys={adminOnlyMissing} />
        </Card>
      ) : (
        <>
          <EditMyStaffDetailsDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            currentAddress={card.address ?? null}
            currentNationalId={card.nationalIdNumber ?? null}
            currentPhone={card.phone ?? null}
          />
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
            {/* Profile panel — photo and quick actions live here, off to the
                side, so the card itself (the actual point of the page)
                doesn't have to share top billing with a stack of edit
                forms above it. */}
            <Card className="space-y-4 p-5 no-print">
              <div className="flex items-center gap-3">
                <PhotoAvatarControl photoUrl={card.photoMissing ? null : card.profilePhoto ?? null} initials={initials} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{card.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{card.systemId}</p>
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setEditOpen(true)}>
                  <Pencil size={14} /> Edit my details
                </Button>
              </div>
              <AdminOnlyMissingNote keys={adminOnlyMissing} />
            </Card>

            {/* The card — given its own contrasting backdrop and generous
                padding so it unmistakably reads as "the product." */}
            <div className="space-y-3">
              <div className="no-print flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowBack((v) => !v)}>
                  <RotateCw size={15} /> {showBack ? 'Show front' : 'Flip to back'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={downloading}
                  disabled={!canIssue}
                  title={canIssue ? undefined : 'Add a photo and CNIC number before downloading your card'}
                  onClick={handleDownload}
                >
                  <Download size={15} /> Download my card
                </Button>
                <Button
                  size="sm"
                  disabled={!canIssue}
                  title={canIssue ? undefined : 'Add a photo and CNIC number before printing your card'}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print my card
                </Button>
              </div>
              <IdCardMissingFieldsBanner items={staffMissingItems} />
              <div
                id="id-card-print"
                className={cn(
                  'flex justify-center rounded-2xl p-6 sm:p-10',
                  canIssue ? 'bg-muted/30' : 'bg-danger-soft/50 ring-1 ring-inset ring-danger/30'
                )}
              >
                <div className="w-full max-w-sm space-y-4">
                  <div ref={frontRef} className={cn(showBack ? 'hidden print:block' : 'block')}>
                    <StaffIdCardItem member={card} institution={card.institution} />
                  </div>
                  <div ref={backRef} className={cn(showBack ? 'block' : 'hidden print:block')}>
                    <IdCardBack
                      institution={card.institution}
                      qrValue={card.qr}
                      rows={staffBackRows(card)}
                      officeLabel={officeLabelForInstitutionType(card.institution?.type)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Self-service "edit my details" dialog for a student/parent — Address,
 *  City, Blood Group, and CNIC/Form-B (see student.service.ts's
 *  updateMyContact()/updateMyStudentContactSchema). */
function EditMyStudentDetailsDialog({
  open, onClose, currentAddress, currentCity, currentBloodGroup, currentNationalId, nationalIdLabel,
}: {
  open: boolean; onClose: () => void;
  currentAddress: string | null; currentCity: string | null; currentBloodGroup: string | null;
  currentNationalId: string | null; nationalIdLabel: string;
}) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [address, setAddress] = useState(currentAddress ?? '');
  const [city, setCity] = useState(currentCity ?? '');
  const [bloodGroup, setBloodGroup] = useState(currentBloodGroup ?? '');
  const [nationalId, setNationalId] = useState(currentNationalId ?? '');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [updateContact, { isLoading: saving }] = useUpdateMyStudentContactMutation();

  // Re-seed the form from the latest server values every time it opens —
  // see EditMyStaffDetailsDialog's matching comment.
  useEffect(() => {
    if (open) {
      setStep('edit');
      setAddress(currentAddress ?? '');
      setCity(currentCity ?? '');
      setBloodGroup(currentBloodGroup ?? '');
      setNationalId(currentNationalId ?? '');
      setNationalIdError(null);
    }
  }, [open, currentAddress, currentCity, currentBloodGroup, currentNationalId]);

  const changes: FieldChange[] = [
    { label: 'Address', before: currentAddress ?? '', after: address.trim() },
    { label: 'City', before: currentCity ?? '', after: city.trim() },
    { label: 'Blood Group', before: currentBloodGroup ?? '', after: bloodGroup },
    { label: `${nationalIdLabel} Number`, before: currentNationalId ?? '', after: nationalId },
  ].filter((c) => c.before !== c.after);

  const handleReview = () => {
    if (nationalId && !/^\d{5}-\d{7}-\d$/.test(nationalId)) {
      setNationalIdError(`Enter a valid ${nationalIdLabel} number in the format 42101-1234567-1`);
      return;
    }
    if (changes.length === 0) {
      toast('No changes to save');
      onClose();
      return;
    }
    setStep('confirm');
  };

  const onConfirm = async () => {
    try {
      await updateContact({
        address: address.trim(),
        city: city.trim(),
        bloodGroup: bloodGroup || undefined,
        nationalIdNumber: nationalId || undefined,
      }).unwrap();
      toast.success('Details saved');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save your details'));
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      icon={step === 'confirm' ? Pencil : MapPin}
      title={step === 'confirm' ? 'Review your changes' : 'Edit my details'}
      footer={
        step === 'confirm' ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setStep('edit')}>Back</Button>
            <Button size="sm" loading={saving} onClick={onConfirm}>Confirm & save</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleReview}>Review changes</Button>
          </>
        )
      }
    >
      {step === 'confirm' ? (
        <>
          <p className="text-sm text-muted-foreground">This is what will change on your profile and ID card:</p>
          <ChangeSummary changes={changes} />
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="edit-my-student-address">Address</Label>
            <Input id="edit-my-student-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
          </div>
          <div>
            <Label htmlFor="edit-my-student-city">City</Label>
            <Input id="edit-my-student-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>Blood Group</Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-my-student-nid">{nationalIdLabel} Number</Label>
            <Input
              id="edit-my-student-nid"
              dir="ltr"
              placeholder="42101-1234567-1"
              inputMode="numeric"
              value={nationalId}
              onChange={(e) => { setNationalId(formatNationalId(e.target.value)); setNationalIdError(null); }}
            />
            {nationalIdError && <p className="mt-1 text-xs text-danger">{nationalIdError}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Class and roll number are managed by the school — ask your admin to update those.
          </p>
        </>
      )}
    </FormDialog>
  );
}

/** Self-service PIN-change dialog — the one thing a student CAN do for
 *  themself with no email/phone on file. Requires the current PIN, same as
 *  any password change flow — see student.service.ts's changeMyPin(). */
function ChangePinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePin, { isLoading: saving }] = useChangeMyPinMutation();

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const validLength = (v: string) => v.length >= 4 && v.length <= 6;
  const canSubmit = validLength(currentPin) && validLength(newPin) && newPin === confirmPin && !saving;

  const reset = () => { setCurrentPin(''); setNewPin(''); setConfirmPin(''); };

  const onSubmit = async () => {
    if (!validLength(newPin)) { toast.error('New PIN must be 4-6 digits'); return; }
    if (newPin !== confirmPin) { toast.error("New PIN and confirmation don't match"); return; }
    try {
      await changePin({ currentPin, newPin }).unwrap();
      toast.success('PIN changed');
      reset();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not change PIN'));
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => { reset(); onClose(); }}
      icon={KeyRound}
      title="Change my PIN"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={onSubmit}>{saving ? 'Saving…' : 'Save new PIN'}</Button>
        </>
      }
    >
      <div>
        <Label htmlFor="current-pin">Current PIN</Label>
        <Input
          id="current-pin"
          type="password"
          inputMode="numeric"
          dir="ltr"
          value={currentPin}
          onChange={(e) => setCurrentPin(digitsOnly(e.target.value))}
          placeholder="4-6 digits"
        />
      </div>
      <div>
        <Label htmlFor="new-pin">New PIN</Label>
        <Input
          id="new-pin"
          type="password"
          inputMode="numeric"
          dir="ltr"
          value={newPin}
          onChange={(e) => setNewPin(digitsOnly(e.target.value))}
          placeholder="4-6 digits"
        />
      </div>
      <div>
        <Label htmlFor="confirm-pin">Confirm new PIN</Label>
        <Input
          id="confirm-pin"
          type="password"
          inputMode="numeric"
          dir="ltr"
          value={confirmPin}
          onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
          placeholder="4-6 digits"
        />
      </div>
    </FormDialog>
  );
}

function StudentMyIdCard() {
  const { data, isFetching, isError } = useGetMyStudentCardQuery();
  const card = data?.data;
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [updateContact, { isLoading: saving }] = useUpdateMyStudentContactMutation();
  const [showBack, setShowBack] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const { term: termLabel } = useTerminology();
  const nationalIdLabel = nationalIdLabelForInstitutionType(card?.institution?.type);

  const handleDownload = async () => {
    if (!frontRef.current || !card) return;
    setDownloading(true);
    try {
      const { downloadCardPdf, cardFileName } = await import('@/components/shared/cardDownload');
      await downloadCardPdf({
        frontEl: frontRef.current,
        backEl: backRef.current,
        fileName: cardFileName(card.name, 'student-id-card'),
      });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not generate the PDF'));
    } finally {
      setDownloading(false);
    }
  };

  const missing = card?.missing ?? [];
  const fixableMissing = missing.filter((k) => SELF_FIXABLE_MISSING_KEYS.has(k));
  const adminOnlyMissing = missing.filter((k) => !SELF_FIXABLE_MISSING_KEYS.has(k));
  // Only block on fields the student can actually fix here — an admin-only
  // key (if the backend ever sends one) shouldn't permanently hide the
  // card, so it just gets an informational note next to the normal card.
  const blocked = fixableMissing.length > 0;

  const initials = card ? card.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '';

  // Same "photo + national ID are required to issue" rule the admin ID
  // card views enforce — see StaffMyIdCard's matching comment.
  const studentSettings = card?.institution?.settings?.idCard;
  const studentMissingKeys = card ? studentCardMissingKeys(card, studentSettings) : [];
  const studentMissingItems: IdCardMissingFieldItem[] = studentMissingKeys.map((key) => ({
    key,
    label: idCardFieldLabel(key, nationalIdLabel),
    required: REQUIRED_CARD_KEYS.has(key),
    action: SELF_FIXABLE_MISSING_KEYS.has(key)
      ? { type: 'cardDetails', onClick: () => setEditOpen(true) }
      : { type: 'none' },
  }));
  const canIssue = cardBlockingMissingKeys(studentMissingKeys).length === 0;

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />
      <PageHeader title="My ID Card" description="Your printable student identity card." />

      {isFetching ? (
        <Card className="p-5 no-print"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : isError || !card ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Couldn't load your card" description="Try refreshing the page." /></Card>
      ) : blocked ? (
        <Card className="mx-auto max-w-sm space-y-4 p-5 no-print">
          <div className="flex items-center gap-3">
            <PhotoAvatarControl photoUrl={card.photoMissing ? null : card.profilePhoto ?? null} initials={initials} />
            <div>
              <p className="text-sm font-semibold text-foreground">One more thing before your card is ready</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {fixableMissing.length === 1 ? 'One field is' : 'A couple of fields are'} missing below.
              </p>
            </div>
          </div>
          {fixableMissing.includes('address') && (
            <div>
              <Label htmlFor="my-address">Address</Label>
              <Input id="my-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
            </div>
          )}
          {fixableMissing.includes('bloodGroup') && (
            <div>
              <Label>Blood Group</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {fixableMissing.includes('nationalId') && (
            <div>
              <Label htmlFor="my-student-nid">{nationalIdLabel} Number</Label>
              <Input
                id="my-student-nid"
                dir="ltr"
                placeholder="42101-1234567-1"
                inputMode="numeric"
                value={nationalId}
                onChange={(e) => { setNationalId(formatNationalId(e.target.value)); setNationalIdError(null); }}
              />
              {nationalIdError && <p className="mt-1 text-xs text-danger">{nationalIdError}</p>}
            </div>
          )}
          <Button
            size="sm"
            disabled={
              saving ||
              (fixableMissing.includes('address') && !address.trim()) ||
              (fixableMissing.includes('bloodGroup') && !bloodGroup) ||
              (fixableMissing.includes('nationalId') && !nationalId.trim())
            }
            onClick={async () => {
              if (fixableMissing.includes('nationalId') && !/^\d{5}-\d{7}-\d$/.test(nationalId)) {
                setNationalIdError(`Enter a valid ${nationalIdLabel} number in the format 42101-1234567-1`);
                return;
              }
              try {
                await updateContact({
                  ...(fixableMissing.includes('address') ? { address: address.trim() } : {}),
                  ...(fixableMissing.includes('bloodGroup') ? { bloodGroup } : {}),
                  ...(fixableMissing.includes('nationalId') ? { nationalIdNumber: nationalId } : {}),
                }).unwrap();
                toast.success('Saved — your card is ready');
              } catch (e) {
                toast.error(getErrorMessage(e, 'Could not save your details'));
              }
            }}
          >
            {saving ? 'Saving…' : 'Save & show my card'}
          </Button>
          <AdminOnlyMissingNote keys={adminOnlyMissing} />
        </Card>
      ) : (
        <>
          <EditMyStudentDetailsDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            currentAddress={card.address ?? null}
            currentCity={card.city ?? null}
            currentBloodGroup={card.bloodGroup ?? null}
            currentNationalId={card.nationalIdNumber ?? null}
            nationalIdLabel={nationalIdLabelForInstitutionType(card.institution?.type)}
          />
          <ChangePinDialog open={pinOpen} onClose={() => setPinOpen(false)} />
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
            {/* Profile panel — see StaffMyIdCard's matching comment on why
                photo/actions live here instead of stacked above the card. */}
            <Card className="space-y-4 p-5 no-print">
              <div className="flex items-center gap-3">
                <PhotoAvatarControl photoUrl={card.photoMissing ? null : card.profilePhoto ?? null} initials={initials} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{card.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Roll #{card.rollNumber}</p>
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setEditOpen(true)}>
                  <Pencil size={14} /> Edit my details
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setPinOpen(true)}>
                  <KeyRound size={14} /> Change my PIN
                </Button>
              </div>
              <AdminOnlyMissingNote keys={adminOnlyMissing} />
            </Card>

            <div className="space-y-3">
              <div className="no-print flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowBack((v) => !v)}>
                  <RotateCw size={15} /> {showBack ? 'Show front' : 'Flip to back'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={downloading}
                  disabled={!canIssue}
                  title={canIssue ? undefined : `Add a photo and ${nationalIdLabel} number before downloading your card`}
                  onClick={handleDownload}
                >
                  <Download size={15} /> Download my card
                </Button>
                <Button
                  size="sm"
                  disabled={!canIssue}
                  title={canIssue ? undefined : `Add a photo and ${nationalIdLabel} number before printing your card`}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print my card
                </Button>
              </div>
              <IdCardMissingFieldsBanner items={studentMissingItems} />
              <div
                id="id-card-print"
                className={cn(
                  'flex justify-center rounded-2xl p-6 sm:p-10',
                  canIssue ? 'bg-muted/30' : 'bg-danger-soft/50 ring-1 ring-inset ring-danger/30'
                )}
              >
                <div className="w-full max-w-sm space-y-4">
                  <div ref={frontRef} className={cn(showBack ? 'hidden print:block' : 'block')}>
                    <IdCardItem
                      student={card}
                      institution={card.institution}
                      className={card.className}
                      section={card.section}
                      termName={card.termName}
                    />
                  </div>
                  <div ref={backRef} className={cn(showBack ? 'block' : 'hidden print:block')}>
                    <IdCardBack
                      institution={card.institution}
                      qrValue={card.qr}
                      validityLabel={card.termName ?? termLabel}
                      rows={studentBackRows(card, card.institution.settings?.idCard?.showBloodGroup ?? true)}
                      officeLabel={officeLabelForInstitutionType(card.institution?.type)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Help — placed after the actual content, same bottom-of-page pattern
          as the admin dashboard's redesigned pages, not before it. */}
      <div className="space-y-2 no-print">
        <InfoNote title="Where's my PIN?">
          <p>
            Your card only shows your <strong>Login ID</strong> — your PIN is never printed anywhere, including here,
            for security. If you don't know your current PIN (for example, you were only ever told your Login ID),
            ask your school to look it up or reset it for you; changing it yourself below needs the current one.
          </p>
        </InfoNote>
      </div>
    </div>
  );
}
