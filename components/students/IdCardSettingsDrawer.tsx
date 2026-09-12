'use client';

import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import { X, Settings2, Upload, Trash2, ImageUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import {
  useGetMyInstitutionQuery,
  useUpdateMyInstitutionMutation,
  useUploadInstitutionIdCardLogoMutation,
  useRemoveInstitutionIdCardLogoMutation,
} from '@/store/api/institutionApi';
import { nationalIdLabelForInstitutionType } from '@/lib/terminology';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;
const isAllowedImageFile = (file: File) => ALLOWED_TYPES.includes(file.type) || HEIC_EXTENSION_RE.test(file.name);

/** Simple on/off switch — no dedicated Switch primitive exists in this
 *  codebase's ui/ kit yet, so this is a small self-contained one built the
 *  same way every other boolean control here is (plain button + Tailwind),
 *  rather than pulling in a new dependency for one drawer. */
function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-1'
          )}
          style={{ height: 18, width: 18, transform: checked ? 'translateX(22px)' : 'translateX(4px)' }}
        />
      </button>
    </div>
  );
}

/**
 * Admin-only "Card settings" dialog — controls the appearance/validity
 * rules applied to every rendered student/staff ID card (IdCardsView.tsx,
 * StaffIdCardsView.tsx, MyIdCardView.tsx). Backed by Institution.settings.idCard
 * via the existing PATCH /institutions/me path (partial `idCard` object),
 * plus a card-specific logo override via its own upload/delete endpoints.
 * Opened from a button on IdCardsHub.tsx.
 */
export function IdCardSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useGetMyInstitutionQuery();
  const [updateInstitution, { isLoading: saving }] = useUpdateMyInstitutionMutation();
  const [uploadLogo, { isLoading: uploading }] = useUploadInstitutionIdCardLogoMutation();
  const [removeLogo, { isLoading: removingLogo }] = useRemoveInstitutionIdCardLogoMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = data?.data?.settings?.idCard;
  const mainLogoUrl = data?.data?.logoUrl;
  // Students' label follows the institution type (Form B for schools/
  // academies, CNIC for colleges/universities — see terminology.ts's own
  // "locked product decision" comment); staff always show "CNIC" regardless
  // of institution type (staff are always adults). This one toggle controls
  // both, so the description below spells out both labels explicitly
  // rather than the drawer just saying the generic combined "Form B/CNIC"
  // it used to, which read as always-both regardless of what actually
  // prints on either card.
  const studentNationalIdLabel = nationalIdLabelForInstitutionType(data?.data?.type);

  const [showNationalId, setShowNationalId] = useState(true);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showInstituteName, setShowInstituteName] = useState(true);
  const [studentValidityMonths, setStudentValidityMonths] = useState('12');
  const [staffValidityMonths, setStaffValidityMonths] = useState('12');

  useEffect(() => {
    if (settings) {
      setShowNationalId(settings.showNationalId);
      setShowBloodGroup(settings.showBloodGroup);
      setShowInstituteName(settings.showInstituteName);
      setStudentValidityMonths(String(settings.studentValidityMonths));
      setStaffValidityMonths(String(settings.staffValidityMonths));
    }
  }, [settings]);

  const handleToggle = async (patch: Partial<{ showNationalId: boolean; showBloodGroup: boolean; showInstituteName: boolean }>) => {
    try {
      await updateInstitution({ idCard: patch }).unwrap();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update card settings'));
    }
  };

  const handleSaveValidity = async () => {
    const studentMonths = Number(studentValidityMonths);
    const staffMonths = Number(staffValidityMonths);
    if (!Number.isInteger(studentMonths) || studentMonths < 1 || studentMonths > 60) {
      toast.error('Student card validity must be a whole number between 1 and 60 months');
      return;
    }
    if (!Number.isInteger(staffMonths) || staffMonths < 1 || staffMonths > 60) {
      toast.error('Staff card validity must be a whole number between 1 and 60 months');
      return;
    }
    try {
      await updateInstitution({
        idCard: { studentValidityMonths: studentMonths, staffValidityMonths: staffMonths },
      }).unwrap();
      toast.success('Card validity settings saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save validity settings'));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
      toast.success('Card logo override uploaded');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not upload card logo'));
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo().unwrap();
      toast.success('Card logo override removed — cards now use your default institution logo');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not remove card logo override'));
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
              <Settings2 size={17} className="text-primary" /> Card settings
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">
            Controls what appears on every student and staff ID card, and how long a card stays valid.
          </DialogPrimitive.Description>

          {isLoading ? (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="mt-4 space-y-1 divide-y divide-border">
              <Toggle
                label={`Show ${studentNationalIdLabel} / CNIC number`}
                description={`National ID number line on cards — shown as "${studentNationalIdLabel}" for students, "CNIC" for staff.`}
                checked={showNationalId}
                onChange={(v) => { setShowNationalId(v); handleToggle({ showNationalId: v }); }}
              />
              <Toggle
                label="Show blood group"
                description="Blood group badge on student cards."
                checked={showBloodGroup}
                onChange={(v) => { setShowBloodGroup(v); handleToggle({ showBloodGroup: v }); }}
              />
              <Toggle
                label="Show institute name"
                description="Institution name in the card header."
                checked={showInstituteName}
                onChange={(v) => { setShowInstituteName(v); handleToggle({ showInstituteName: v }); }}
              />

              <div className="grid grid-cols-2 gap-3 py-3">
                <div>
                  <Label htmlFor="student-validity">Student card validity (months)</Label>
                  <Input
                    id="student-validity"
                    type="number"
                    dir="ltr"
                    min={1}
                    max={60}
                    value={studentValidityMonths}
                    onChange={(e) => setStudentValidityMonths(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="staff-validity">Staff card validity (months)</Label>
                  <Input
                    id="staff-validity"
                    type="number"
                    dir="ltr"
                    min={1}
                    max={60}
                    value={staffValidityMonths}
                    onChange={(e) => setStaffValidityMonths(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This only applies to cards issued from now on — it won&apos;t change the
                validity already printed on existing cards. To apply a new validity
                window to cards that already exist, use &quot;Re-issue cards&quot; on the
                Students/Staff tab.
              </p>
              <div className="flex justify-end pb-1 pt-2">
                <Button size="sm" loading={saving} onClick={handleSaveValidity}>Save validity</Button>
              </div>

              <div className="pt-4">
                <p className="text-sm font-medium text-foreground">Card logo override</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Optional — used only on ID cards. Leave unset to use your institution&apos;s default logo.
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                    {settings?.customLogoUrl || mainLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings?.customLogoUrl ?? mainLogoUrl} alt="Card logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageUp size={22} className="text-muted-foreground" />
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
                    <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                      <Upload size={13} /> {settings?.customLogoUrl ? 'Replace' : 'Upload override'}
                    </Button>
                    {settings?.customLogoUrl && (
                      <Button type="button" variant="ghost" size="sm" loading={removingLogo} onClick={handleRemoveLogo} className="text-danger hover:bg-danger-soft">
                        <Trash2 size={13} /> Remove override
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  For best results on ID cards, use a PNG with a transparent background.
                </p>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
