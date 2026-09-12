'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import { X, CreditCard as IdCardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isInsideRadixPopper, POINTER_EVENTS_OVERRIDE } from '@/components/ui/sheet';
import { getErrorMessage } from '@/lib/get-error-message';
import { formatNationalId } from '@/lib/utils';
import { useUpdateStudentMutation } from '@/store/api/studentsApi';
import { useUpdateUserMutation } from '@/store/api/usersApi';
import { PhotoUpload } from '@/components/shared/PhotoUpload';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// yyyy-mm-dd for a native <input type="date">, same conversion used by
// AcademicYearView.tsx for the same reason (backend dates arrive as full
// ISO datetime strings).
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  onClose: () => void;
  target: {
    id: string;
    name: string;
    kind: 'student' | 'staff';
    nationalIdLabel: string;
    nationalIdNumber: string | null;
    cardIssueDate: string | null;
    cardExpiryDate: string | null;
    bloodGroup?: string | null;
    address?: string | null;
    // Student only — the ID card's "Parent/Guardian info" field. Plain
    // text on the student record itself, distinct from a linked guardian
    // account, so it's safe to edit here without touching guardian login.
    parentName?: string | null;
    parentPhone?: string | null;
    parentEmail?: string | null;
    // Photo lives on the underlying User document, not the student/staff
    // record itself, so it needs that document's own id to call the
    // photo endpoints (see PhotoUpload). For staff, `target.id` already
    // IS that id. For a student, this is only available when the caller
    // has the full student record (getStudent) — the plain list endpoint
    // doesn't include it (same constraint StudentFormDrawer already has),
    // so photo editing is simply omitted here when it's missing rather
    // than sending a request that can't succeed.
    userId?: string | null;
    profilePhoto?: string | null;
  };
}

/**
 * Admin-only editor for the fields an ID card needs that don't otherwise
 * have a home outside the full student/staff edit form: national ID
 * number, issue/expiry dates, blood group and parent/guardian info
 * (students only), address, and photo. Deliberately still not a reuse of
 * StudentFormDrawer — that form covers the entire record (class
 * assignment, login contact info, enrollment status, etc.) and would be a
 * lot of unrelated surface area for what's meant to be a quick, focused
 * "fix what's missing from the card" flow. Calls PATCH /students/:id or
 * PATCH /users/:id (plus the separate photo endpoints for photo) — the
 * same record the full edit form writes to, not a duplicate copy of it.
 */
export function EditCardDetailsDialog({ open, onClose, target }: Props) {
  // Original values as they arrived — used at submit time to tell "admin
  // never touched this field" (started empty, still empty: omit from the
  // PATCH body entirely) apart from "admin explicitly cleared it" (started
  // with a value, input is now empty: must send null so the backend
  // actually blanks it out, rather than silently leaving the old value in
  // place — see student.validator.ts/user.validator.ts's nullable field
  // variants for what the backend now accepts).
  const initialNationalId = target.nationalIdNumber ?? '';
  const initialIssueDate = toDateInputValue(target.cardIssueDate);
  const initialExpiryDate = toDateInputValue(target.cardExpiryDate);
  const initialBloodGroup = target.bloodGroup ?? '';
  const initialAddress = target.address ?? '';
  const initialParentName = target.parentName ?? '';
  const initialParentPhone = target.parentPhone ?? '';
  const initialParentEmail = target.parentEmail ?? '';

  const [nationalIdNumber, setNationalIdNumber] = useState(initialNationalId);
  const [cardIssueDate, setCardIssueDate] = useState(initialIssueDate);
  const [cardExpiryDate, setCardExpiryDate] = useState(initialExpiryDate);
  const [bloodGroup, setBloodGroup] = useState(initialBloodGroup);
  const [address, setAddress] = useState(initialAddress);
  const [parentName, setParentName] = useState(initialParentName);
  const [parentPhone, setParentPhone] = useState(initialParentPhone);
  const [parentEmail, setParentEmail] = useState(initialParentEmail);

  const [updateStudent, { isLoading: savingStudent }] = useUpdateStudentMutation();
  const [updateUser, { isLoading: savingUser }] = useUpdateUserMutation();
  const saving = savingStudent || savingUser;

  const onSubmit = async () => {
    const body: {
      nationalIdNumber?: string | null;
      cardIssueDate?: string | null;
      cardExpiryDate?: string | null;
      bloodGroup?: string | null;
      address?: string | null;
      parentName?: string | null;
      parentPhone?: string | null;
      parentEmail?: string | null;
    } = {};

    // Field left at its starting value (whether that's blank or something
    // the admin didn't change) — omit it so the PATCH doesn't touch it.
    // Field now blank but started with a value — admin cleared it on
    // purpose, send null explicitly. Field now has a (possibly changed)
    // value — send the trimmed value.
    const applyField = (key: keyof typeof body, initial: string, current: string) => {
      const trimmedCurrent = current.trim();
      if (trimmedCurrent === initial.trim()) return; // untouched, don't send
      body[key] = trimmedCurrent ? trimmedCurrent : null;
    };

    applyField('nationalIdNumber', initialNationalId, nationalIdNumber);
    applyField('address', initialAddress, address);
    if (target.kind === 'student') {
      applyField('parentName', initialParentName, parentName);
      applyField('parentPhone', initialParentPhone, parentPhone);
      applyField('parentEmail', initialParentEmail, parentEmail);
    }
    applyField('cardIssueDate', initialIssueDate, cardIssueDate);
    applyField('cardExpiryDate', initialExpiryDate, cardExpiryDate);
    if (target.kind === 'student') applyField('bloodGroup', initialBloodGroup, bloodGroup);

    try {
      if (target.kind === 'student') {
        await updateStudent({ id: target.id, body }).unwrap();
      } else {
        await updateUser({ id: target.id, body }).unwrap();
      }
      toast.success('Card details updated');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update card details'));
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none ${POINTER_EVENTS_OVERRIDE}`}
          onPointerDownOutside={(e) => { if (isInsideRadixPopper(e.target)) e.preventDefault(); }}
          onInteractOutside={(e) => { if (isInsideRadixPopper(e.target)) e.preventDefault(); }}
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
              <IdCardIcon size={16} className="text-primary" /> Edit card details — {target.name}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {target.userId && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <Label className="shrink-0">Photo</Label>
                <PhotoUpload
                  userId={target.userId}
                  photoUrl={target.profilePhoto}
                  initials={target.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  size="md"
                  className="flex-row-reverse"
                />
              </div>
            )}
            <div>
              <Label htmlFor="card-address">Address</Label>
              <Input id="card-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / street / area" />
            </div>
            <div>
              <Label htmlFor="card-national-id">{target.nationalIdLabel} number</Label>
              <Input
                id="card-national-id"
                dir="ltr"
                inputMode="numeric"
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(formatNationalId(e.target.value))}
                placeholder="42101-1234567-1"
              />
            </div>
            {/* Only shown when there's genuinely no guardian on file yet —
                student.service.ts's update() only resolves/creates a
                guardian from parentName/parentPhone/parentEmail when the
                student has zero guardianIds; once one exists, editing an
                existing guardian's own details is a separate flow (their
                own account), not something this quick dialog can silently
                overwrite. */}
            {target.kind === 'student' && !initialParentName && (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Parent / guardian</p>
                <div>
                  <Label htmlFor="card-parent-name">Name</Label>
                  <Input id="card-parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="card-parent-phone">Phone</Label>
                    <Input id="card-parent-phone" dir="ltr" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="03xxxxxxxxx" />
                  </div>
                  <div>
                    <Label htmlFor="card-parent-email">Email</Label>
                    <Input id="card-parent-email" dir="ltr" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Filling this in links (or creates) a guardian account and emails them their login, same as adding one from the full student form.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-issue-date">Issue date</Label>
                <Input id="card-issue-date" type="date" dir="ltr" value={cardIssueDate} onChange={(e) => setCardIssueDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="card-expiry-date">Expiry date</Label>
                <Input id="card-expiry-date" type="date" dir="ltr" value={cardExpiryDate} onChange={(e) => setCardExpiryDate(e.target.value)} />
              </div>
            </div>
            {target.kind === 'student' && (
              <div>
                <Label>Blood group</Label>
                <Select value={bloodGroup || undefined} onValueChange={setBloodGroup}>
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={onSubmit}>Save</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
