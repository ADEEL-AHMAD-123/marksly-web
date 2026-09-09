'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import { X, CreditCard as IdCardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/get-error-message';
import { useUpdateStudentMutation } from '@/store/api/studentsApi';
import { useUpdateUserMutation } from '@/store/api/usersApi';

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
  };
}

/**
 * Small, focused admin-only editor for the three-to-four fields that live
 * only on an ID card and nowhere else in the regular student/staff edit
 * forms: national ID number, issue/expiry dates, and (students only) blood
 * group. Deliberately not a reuse of StudentFormDrawer — that form covers
 * the entire student record and would be a lot of unrelated surface area
 * for what's meant to be a quick card-detail fix. Calls PATCH /students/:id
 * or PATCH /users/:id with just these fields.
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

  const [nationalIdNumber, setNationalIdNumber] = useState(initialNationalId);
  const [cardIssueDate, setCardIssueDate] = useState(initialIssueDate);
  const [cardExpiryDate, setCardExpiryDate] = useState(initialExpiryDate);
  const [bloodGroup, setBloodGroup] = useState(initialBloodGroup);

  const [updateStudent, { isLoading: savingStudent }] = useUpdateStudentMutation();
  const [updateUser, { isLoading: savingUser }] = useUpdateUserMutation();
  const saving = savingStudent || savingUser;

  const onSubmit = async () => {
    const body: {
      nationalIdNumber?: string | null;
      cardIssueDate?: string | null;
      cardExpiryDate?: string | null;
      bloodGroup?: string | null;
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
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
              <IdCardIcon size={16} className="text-primary" /> Edit card details — {target.name}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="card-national-id">{target.nationalIdLabel} number</Label>
              <Input
                id="card-national-id"
                dir="ltr"
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value)}
                placeholder="42101-1234567-1"
              />
            </div>
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
