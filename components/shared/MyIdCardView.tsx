'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, CreditCard as IdCardIcon, Loader2, MapPin, Droplet, Camera, X, RotateCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { useAppSelector } from '@/store/hooks';
import { getErrorMessage } from '@/lib/get-error-message';
import {
  useGetMyCardQuery,
  useUpdateMyContactMutation,
  useUploadMyPhotoMutation,
  useRemoveMyPhotoMutation,
} from '@/store/api/usersApi';
import { useGetMyStudentCardQuery, useUpdateMyStudentContactMutation, useChangeMyPinMutation } from '@/store/api/studentsApi';
import { KeyRound, Info } from 'lucide-react';
import { idCardFieldLabel, SELF_FIXABLE_MISSING_KEYS } from '@/lib/id-card-missing';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Self-service profile photo uploader — shared by both staff and student
 * "My ID Card" pages. Uploads/removes the CALLER'S OWN photo via
 * /users/me/photo (uploadMyPhoto/removeMyPhoto), unlike the admin-facing
 * PhotoUpload component which targets a userId param. Kept intentionally
 * small (no drag/drop) since this is a single self-serve action, not a
 * bulk-management table cell.
 */
function MyPhotoUploader({ hasPhoto }: { hasPhoto: boolean }) {
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
    // Opens the crop/zoom editor instead of uploading straight away — the
    // ID card shows this photo cropped to a circle, so letting the person
    // frame their own face first (rather than hoping the original photo
    // happens to crop well) is the whole point of this modal.
    setPendingFile(file);
  };

  const handleCropped = async (cropped: File) => {
    setPendingFile(null);
    try {
      await upload({ file: cropped }).unwrap();
      toast.success(hasPhoto ? 'Photo updated' : 'Photo added — your card now shows it');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not upload photo'));
    }
  };

  return (
    <>
      <PhotoCropModal open={!!pendingFile} file={pendingFile} onClose={() => setPendingFile(null)} onCropped={handleCropped} />
      <Card className="no-print flex max-w-sm items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Camera size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{hasPhoto ? 'Profile photo' : 'No photo on file yet'}</p>
            <p className="text-xs text-muted-foreground">
              {hasPhoto
                ? 'Used on your ID card.'
                : 'Your card still works with your initials — add a photo any time. A clear, front-facing shot works best.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset immediately, not after the crop/upload resolves — a
              // browser <input type="file"> never fires onChange again for
              // the SAME file path unless its value is cleared first, so
              // without this, picking a photo, cancelling the crop editor,
              // then picking that exact same file again would silently do
              // nothing.
              e.target.value = '';
              handleFile(file);
            }}
          />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {hasPhoto ? 'Change' : 'Add photo'}
          </Button>
          {hasPhoto && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                try {
                  await remove().unwrap();
                  toast.success('Photo removed');
                } catch (e) {
                  toast.error(getErrorMessage(e, 'Could not remove photo'));
                }
              }}
            >
              {removing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}
import { ID_CARD_PRINT_CSS } from '@/components/shared/idCardPrint';
import { IdCardBack } from '@/components/shared/IdCardBack';
import { PhotoCropModal } from '@/components/shared/PhotoCropModal';
import { StaffIdCardItem, staffBackRows } from '@/components/staff/StaffIdCardsView';
import { IdCardItem, studentBackRows } from '@/components/students/IdCardsView';
import { cn, formatNationalId } from '@/lib/utils';
import { useTerminology, nationalIdLabelForInstitutionType } from '@/lib/terminology';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
 * same as teacher/staff/accountant). Shows nothing until the account's own
 * required fields are filled in (same "no card before complete info"
 * principle as the admin bulk views), then renders the exact same printable
 * card component the admin's own ID Cards page uses.
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

/**
 * Always-available "Edit my details" card for staff — lets someone update
 * their own Address any time, not just during the one-time "card blocked
 * until this is filled in" gate below. Collapsed by default, same low-key
 * pattern as ChangeMyPinCard. Designation/joining date/CNIC are deliberately
 * NOT editable here — those stay admin-managed (see user.validator.ts's
 * updateMyContactSchema, which only ever accepts phone/address).
 */
function EditMyStaffDetailsCard({ currentAddress, currentNationalId }: { currentAddress: string | null; currentNationalId: string | null }) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(currentAddress ?? '');
  const [nationalId, setNationalId] = useState(currentNationalId ?? '');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [updateContact, { isLoading: saving }] = useUpdateMyContactMutation();

  if (!open) {
    return (
      <Card className="no-print flex max-w-sm items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MapPin size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">My details</p>
            <p className="text-xs text-muted-foreground">Update your address or CNIC.</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setAddress(currentAddress ?? ''); setNationalId(currentNationalId ?? ''); setNationalIdError(null); setOpen(true); }}
        >
          Edit
        </Button>
      </Card>
    );
  }

  return (
    <Card className="no-print max-w-sm space-y-3 p-4">
      <p className="text-sm font-semibold text-foreground">Edit my details</p>
      <div>
        <Label htmlFor="edit-my-address">Address</Label>
        <Input id="edit-my-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
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
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            if (nationalId && !/^\d{5}-\d{7}-\d$/.test(nationalId)) {
              setNationalIdError('Enter a valid CNIC in the format 42101-1234567-1');
              return;
            }
            try {
              await updateContact({ address: address.trim(), nationalIdNumber: nationalId || undefined }).unwrap();
              toast.success('Details saved');
              setOpen(false);
            } catch (e) {
              toast.error(getErrorMessage(e, 'Could not save your details'));
            }
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
}

function StaffMyIdCard() {
  const { data, isFetching, isError } = useGetMyCardQuery();
  const card = data?.data;
  const [updateContact, { isLoading: saving }] = useUpdateMyContactMutation();
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);

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

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />
      <PageHeader title="My ID Card" description="Your printable staff identity card." />

      {isFetching ? (
        <Card className="p-5 no-print"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : isError || !card ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Couldn't load your card" description="Try refreshing the page." /></Card>
      ) : blocked ? (
        <Card className="max-w-sm space-y-4 p-5 no-print">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <MapPin size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">One more thing before your card is ready</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {fixableMissing.length === 1 ? 'One field is' : 'A couple of fields are'} missing — add {fixableMissing.length === 1 ? 'it' : 'them'} below and your card appears immediately.
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
          <MyPhotoUploader hasPhoto={!card.photoMissing} />
          <AdminOnlyMissingNote keys={adminOnlyMissing} />
        </Card>
      ) : (
        <>
          <AdminOnlyMissingNote keys={adminOnlyMissing} />
          <MyPhotoUploader hasPhoto={!card.photoMissing} />
          <EditMyStaffDetailsCard currentAddress={card.address ?? null} currentNationalId={card.nationalIdNumber ?? null} />
          <div className="no-print flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBack((v) => !v)}>
              <RotateCw size={15} /> {showBack ? 'Show front' : 'Flip to back'}
            </Button>
            <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print my card</Button>
          </div>
          <div id="id-card-print" className="flex justify-center">
            <div className="w-full max-w-sm space-y-4">
              <div className={cn(showBack ? 'hidden print:block' : 'block')}>
                <StaffIdCardItem member={card} institution={card.institution} />
              </div>
              <div className={cn(showBack ? 'block' : 'hidden print:block')}>
                <IdCardBack institution={card.institution} qrValue={card.qr} rows={staffBackRows(card)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Low-key "Change my PIN" card — the one thing a student CAN do for
 * themself with no email/phone on file. Kept as an optional, collapsible
 * card (not a forced modal) right next to the photo uploader, same
 * self-service spirit. Requires the current PIN, same as any password
 * change flow — see student.service.ts's changeMyPin().
 */
function ChangeMyPinCard() {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not change PIN'));
    }
  };

  if (!open) {
    return (
      <Card className="no-print flex max-w-sm items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <KeyRound size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Login PIN</p>
            <p className="text-xs text-muted-foreground">Change the PIN you use to log in.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Change my PIN</Button>
      </Card>
    );
  }

  return (
    <Card className="no-print max-w-sm space-y-3 p-4">
      <p className="text-sm font-semibold text-foreground">Change my PIN</p>
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
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!canSubmit} onClick={onSubmit}>
          {saving ? 'Saving…' : 'Save new PIN'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
      </div>
    </Card>
  );
}

/**
 * Always-available "Edit my details" card for a student/parent — same
 * pattern as EditMyStaffDetailsCard, for Address/City/Blood Group/CNIC
 * (Form-B), all genuinely self-service (see student.service.ts's
 * updateMyContact()/updateMyStudentContactSchema).
 */
function EditMyStudentDetailsCard({
  currentAddress, currentCity, currentBloodGroup, currentNationalId, nationalIdLabel,
}: {
  currentAddress: string | null; currentCity: string | null; currentBloodGroup: string | null;
  currentNationalId: string | null; nationalIdLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(currentAddress ?? '');
  const [city, setCity] = useState(currentCity ?? '');
  const [bloodGroup, setBloodGroup] = useState(currentBloodGroup ?? '');
  const [nationalId, setNationalId] = useState(currentNationalId ?? '');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [updateContact, { isLoading: saving }] = useUpdateMyStudentContactMutation();

  if (!open) {
    return (
      <Card className="no-print flex max-w-sm items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MapPin size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">My details</p>
            <p className="text-xs text-muted-foreground">Update address, city, blood group, or {nationalIdLabel}.</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setAddress(currentAddress ?? '');
            setCity(currentCity ?? '');
            setBloodGroup(currentBloodGroup ?? '');
            setNationalId(currentNationalId ?? '');
            setNationalIdError(null);
            setOpen(true);
          }}
        >
          Edit
        </Button>
      </Card>
    );
  }

  return (
    <Card className="no-print max-w-sm space-y-3 p-4">
      <p className="text-sm font-semibold text-foreground">Edit my details</p>
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
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            if (nationalId && !/^\d{5}-\d{7}-\d$/.test(nationalId)) {
              setNationalIdError(`Enter a valid ${nationalIdLabel} number in the format 42101-1234567-1`);
              return;
            }
            try {
              await updateContact({
                address: address.trim(),
                city: city.trim(),
                bloodGroup: bloodGroup || undefined,
                nationalIdNumber: nationalId || undefined,
              }).unwrap();
              toast.success('Details saved');
              setOpen(false);
            } catch (e) {
              toast.error(getErrorMessage(e, 'Could not save your details'));
            }
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
}

function StudentMyIdCard() {
  const { data, isFetching, isError } = useGetMyStudentCardQuery();
  const card = data?.data;
  const [updateContact, { isLoading: saving }] = useUpdateMyStudentContactMutation();
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const { term: termLabel } = useTerminology();
  const nationalIdLabel = nationalIdLabelForInstitutionType(card?.institution?.type);

  const missing = card?.missing ?? [];
  const fixableMissing = missing.filter((k) => SELF_FIXABLE_MISSING_KEYS.has(k));
  const adminOnlyMissing = missing.filter((k) => !SELF_FIXABLE_MISSING_KEYS.has(k));
  // Only block on fields the student can actually fix here — an admin-only
  // key (if the backend ever sends one) shouldn't permanently hide the
  // card, so it just gets an informational note next to the normal card.
  const blocked = fixableMissing.length > 0;

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />
      <PageHeader title="My ID Card" description="Your printable student identity card." />

      <InfoNote title="Where's my PIN?">
        <p>
          Your card only shows your <strong>Login ID</strong> — your PIN is never printed anywhere, including here,
          for security. If you don't know your current PIN (for example, you were only ever told your Login ID),
          ask your school to look it up or reset it for you; changing it yourself below needs the current one.
        </p>
      </InfoNote>

      {isFetching ? (
        <Card className="p-5 no-print"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : isError || !card ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Couldn't load your card" description="Try refreshing the page." /></Card>
      ) : blocked ? (
        <Card className="max-w-sm space-y-4 p-5 no-print">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Droplet size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">One more thing before your card is ready</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {fixableMissing.length === 1 ? 'One field is' : 'A couple of fields are'} missing — add {fixableMissing.length === 1 ? 'it' : 'them'} below and your card appears immediately.
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
          <MyPhotoUploader hasPhoto={!card.photoMissing} />
          <AdminOnlyMissingNote keys={adminOnlyMissing} />
          <ChangeMyPinCard />
        </Card>
      ) : (
        <>
          <AdminOnlyMissingNote keys={adminOnlyMissing} />
          <MyPhotoUploader hasPhoto={!card.photoMissing} />
          <EditMyStudentDetailsCard
            currentAddress={card.address ?? null}
            currentCity={card.city ?? null}
            currentBloodGroup={card.bloodGroup ?? null}
            currentNationalId={card.nationalIdNumber ?? null}
            nationalIdLabel={nationalIdLabelForInstitutionType(card.institution?.type)}
          />
          <ChangeMyPinCard />
          <div className="no-print flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBack((v) => !v)}>
              <RotateCw size={15} /> {showBack ? 'Show front' : 'Flip to back'}
            </Button>
            <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print my card</Button>
          </div>
          <div id="id-card-print" className="flex justify-center">
            <div className="w-full max-w-sm space-y-4">
              <div className={cn(showBack ? 'hidden print:block' : 'block')}>
                <IdCardItem
                  student={card}
                  institution={card.institution}
                  className={card.className}
                  section={card.section}
                  termName={card.termName}
                />
              </div>
              <div className={cn(showBack ? 'block' : 'hidden print:block')}>
                <IdCardBack
                  institution={card.institution}
                  qrValue={card.qr}
                  validityLabel={card.termName ?? termLabel}
                  rows={studentBackRows(card, card.institution.settings?.idCard?.showBloodGroup ?? true)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
