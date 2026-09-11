'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PhotoUpload } from '@/components/shared/PhotoUpload';
import { getErrorMessage, getErrorCode } from '@/lib/get-error-message';
import { formatNationalId } from '@/lib/utils';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetActiveTermsQuery } from '@/store/api/termsApi';
import { useTerminology, getTerminologyForTermType, useNationalIdLabel } from '@/lib/terminology';
import {
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useUpdateGuardianContactMutation,
  useResendStudentCredentialsMutation,
  useResetStudentPinMutation,
  type StudentListItem,
} from '@/store/api/studentsApi';

// Students never have their own email/phone, in any flow — the only contact
// channel that will ever exist for a student is their guardian, collected
// below via parentEmail/parentPhone, which is now unconditionally required
// (mirrors the backend's createStudentSchema exactly — see student.validator.ts).
const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  rollNumber: z.string().min(1, 'Required'),
  admissionNumber: z.string().min(1, 'Required'),
  classId: z.string().min(1, 'Select a class'),
  sectionId: z.string().min(1, 'Select a section'),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Select gender' }),
  }),
  // Not required to create a student — but shown on the ID card, so left
  // fillable here (and via the student/parent's own "My ID Card" page) so
  // an admin isn't the only one who can ever complete these.
  address: z.string().optional(),
  city: z.string().optional(),
  bloodGroup: z.string().optional(),
  // Optional — format matches the backend's NATIONAL_ID_REGEX exactly (see
  // marksly-api's national-id.schema.ts). Label ("Form B" vs "CNIC") is
  // decided at display time from the institution's type, not stored here.
  nationalIdNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{5}-\d{7}-\d$/.test(v), 'Enter a valid number in the format 42101-1234567-1'),
  // Guardian phone is what the absentee-report WhatsApp links (see
  // AttendanceReportView.tsx) actually message — capturing it in E.164 up
  // front means those links work without any later phone-normalization
  // guesswork.
  parentPhone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  parentName: z.string().optional(),
  parentEmail: z.string().email('Enter a valid email address').optional().or(z.literal('')),
}).refine((d) => !d.parentPhone || !!d.parentEmail, {
  message: 'Guardian email is required when adding a guardian',
  path: ['parentEmail'],
});

/**
 * Cross-field "someone needs to be reachable" rule, mirroring the backend's
 * createStudentSchema: a guardian contact is unconditionally required, either
 * a brand-new one (parentEmail/parentPhone) or an already-linked one (only
 * possible when editing). Kept as a factory since "already has a guardian"
 * depends on the `student` prop, not just the form's own fields.
 */
function makeSchema(hasExistingGuardian: boolean) {
  return schema.refine(
    (d) => !!d.parentPhone || !!d.parentEmail || hasExistingGuardian,
    {
      message: "Add a parent/guardian's contact info so someone can be reached — students don't have their own login contact info.",
      path: ['parentEmail'],
    }
  );
}

type Form = z.infer<typeof schema>;

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
  termType?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  student?: StudentListItem | null;
  // Teachers can only add students to their own class/section — passing
  // this restricts the class/section pickers to a fixed list (from
  // useMyClassesQuery) instead of fetching every class in the institution,
  // which teachers aren't allowed to write into anyway (enforced again
  // server-side in student.service.ts).
  classesOverride?: ClassOption[];
}

export function StudentFormDrawer({ open, onClose, student, classesOverride }: Props) {
  const terminology = useTerminology();
  const nationalIdLabel = useNationalIdLabel();
  const isEdit = !!student;
  const { data: classesRes } = useGetClassesQuery(undefined, { skip: !!classesOverride });
  const classes = useMemo(() => classesOverride ?? classesRes?.data ?? [], [classesOverride, classesRes]);
  // Only relevant when the admin's own class list is empty — a teacher
  // restricted to classesOverride never needs to hear about terms, since
  // they can't create classes/terms either way; their message is the
  // separate "ask an admin" one below.
  const { data: activeTermsRes } = useGetActiveTermsQuery(undefined, { skip: !!classesOverride });
  const noActiveTerms = (activeTermsRes?.data?.length ?? 0) === 0;
  const [createStudent, { isLoading: creating }] = useCreateStudentMutation();
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [updateGuardianContact, { isLoading: updatingGuardianContact }] = useUpdateGuardianContactMutation();
  const [resendCredentials, { isLoading: resending }] = useResendStudentCredentialsMutation();
  const [resetPin, { isLoading: resettingPin }] = useResetStudentPinMutation();
  const [resendingTarget, setResendingTarget] = useState<'student' | 'parent' | null>(null);
  // An existing guardian already satisfies "someone can be reached" even if
  // this edit leaves the guardian fields blank — see makeSchema.
  const activeSchema = useMemo(() => makeSchema(!!student?.guardianName), [student?.guardianName]);
  // The guardian's contact values as prefilled from the server, captured at
  // drawer-open time — used purely to detect "did the admin actually change
  // this" on submit, since changing email/phone changes the guardian's login
  // credential and (if shared across siblings) every linked child's login.
  const [originalGuardian, setOriginalGuardian] = useState<{ id?: string; phone: string; email: string } | null>(null);
  // Holds the submitted form values while we wait for the admin to confirm
  // the guardian-contact-change warning; cleared once they confirm or cancel.
  const [pendingGuardianChange, setPendingGuardianChange] = useState<Form | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(activeSchema),
    defaultValues: {
      firstName: '', lastName: '',
      rollNumber: '', admissionNumber: '', classId: '', sectionId: '', gender: 'male',
      parentPhone: '', parentName: '', parentEmail: '',
      address: '', city: '', bloodGroup: '', nationalIdNumber: '',
    },
  });

  const selectedClassId = watch('classId');
  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedClassId), [classes, selectedClassId]);
  const sections = selectedClass?.sections ?? [];
  // Once a class is actually picked, prefer its own term's wording (e.g. a
  // short-session course should say "Batch") over the institution-wide
  // default terminology below.
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? terminology.section;

  // Prefill on open
  useEffect(() => {
    if (!open) return;
    if (student) {
      const cls = classes.find((c) => c.name === student.className);
      const sec = cls?.sections.find((s) => s.name === student.section);
      // Prefill the existing guardian's contact info too — previously this
      // section was hidden entirely when a guardian already existed, which
      // made it look like the data was missing. `guardians[0]` (added
      // alongside guardianEmail on the list endpoint) carries the id needed
      // to target updateGuardianContact; guardianPhone/guardianName are the
      // long-standing fallback fields if `guardians` isn't present.
      const existingGuardian = student.guardians?.[0];
      const guardianPhone = existingGuardian?.phone ?? student.guardianPhone ?? '';
      const guardianName = existingGuardian?.name ?? student.guardianName ?? '';
      const guardianEmail = existingGuardian?.email ?? student.guardianEmail ?? '';
      reset({
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        classId: cls?.id ?? '',
        sectionId: sec?.id ?? '',
        gender: student.gender,
        address: student.address ?? '',
        city: student.city ?? '',
        bloodGroup: student.bloodGroup ?? '',
        nationalIdNumber: student.nationalIdNumber ?? '',
        parentPhone: guardianPhone,
        parentName: guardianName,
        parentEmail: guardianEmail,
      });
      setOriginalGuardian(
        student.guardianName || existingGuardian
          ? { id: existingGuardian?.id, phone: guardianPhone, email: guardianEmail }
          : null
      );
    } else {
      // Auto-select when there's only one option — mainly for teachers, who
      // (via classesOverride) usually only have one class/section to add
      // into and shouldn't have to pick it from a dropdown every time.
      const onlyClass = classes.length === 1 ? classes[0] : undefined;
      const onlySection = onlyClass?.sections.length === 1 ? onlyClass.sections[0] : undefined;
      reset({
        firstName: '', lastName: '',
        rollNumber: '', admissionNumber: '',
        classId: onlyClass?.id ?? '', sectionId: onlySection?.id ?? '', gender: 'male',
        parentPhone: '', parentName: '', parentEmail: '',
        address: '', city: '', bloodGroup: '', nationalIdNumber: '',
      });
      setOriginalGuardian(null);
    }
    setPendingGuardianChange(null);
  }, [open, student, classes, reset]);

  const noClasses = classes.length === 0;
  // Every student always gets a systemId (Login ID) + an auto-generated PIN
  // now — no more "if no email/phone" branching. Kept as its own kind (not
  // just reusing TempPasswordDialog's plain password shape) since it needs
  // to show the systemId alongside the PIN.
  type TempPasswordInfo =
    // Legacy resend-to-student-phone path only (target === 'student' in
    // resendCredentials — still password-based, see that method's own
    // comment on why the PIN redesign left it untouched).
    | { kind: 'password'; name: string; phone: string; tempPassword: string; emailed: boolean; roleLabel?: 'Parent' }
    // A student's own Login ID + PIN.
    | { kind: 'pin'; name: string; systemId: string; pin: string }
    // A guardian's PIN — same login mechanism as the student's, just no
    // systemId (guardians log in with phone/email instead). roleLabel
    // ('Parent') is always set here since the name shown is the parent's,
    // not the student's.
    | { kind: 'guardianPin'; name: string; pin: string; emailed: boolean; roleLabel: 'Parent' };
  // A queue, not a single value — creating a student can mint up to TWO new
  // logins at once (the student's own + a brand-new guardian's), each with
  // its own one-time-only credential. Shown one at a time so neither gets
  // silently skipped.
  const [tempPasswordQueue, setTempPasswordQueue] = useState<TempPasswordInfo[]>([]);
  const tempPasswordInfo = tempPasswordQueue[0] ?? null;
  const dismissTempPasswordInfo = () => setTempPasswordQueue((q) => q.slice(1));

  // A guardian's email/phone doubles as their login identifier, so changing
  // either isn't a quiet side-effect of a routine edit — it's caught here
  // and routed through a confirm step (see pendingGuardianChange) before
  // anything is actually sent.
  const guardianContactChanged = (values: Form) =>
    !!originalGuardian &&
    ((values.parentPhone || '') !== originalGuardian.phone ||
      (values.parentEmail || '') !== originalGuardian.email);

  const onSubmit = async (values: Form) => {
    if (isEdit && student && guardianContactChanged(values) && !pendingGuardianChange) {
      setPendingGuardianChange(values);
      return;
    }
    await doSubmit(values);
  };

  const doSubmit = async (values: Form) => {
    const { parentPhone, parentName, parentEmail, ...core } = values;
    try {
      if (isEdit && student) {
        const res = await updateStudent({ id: student.id, body: core }).unwrap();
        // Guardian contact is a separate, dedicated endpoint from the rest of
        // the edit — see student.service.ts's updateGuardianContact() for why
        // (it's the one path that can change a guardian's login and, when
        // shared, every linked sibling's login too).
        if (originalGuardian) {
          if (guardianContactChanged(values)) {
            const gRes = await updateGuardianContact({
              id: student.id,
              guardianUserId: originalGuardian.id,
              name: parentName || undefined,
              phone: parentPhone || undefined,
              email: parentEmail || undefined,
            }).unwrap();
            if (gRes.data.siblingCount > 0) {
              toast.success(`Guardian contact updated — also affects ${gRes.data.siblingCount} other linked ${gRes.data.siblingCount === 1 ? 'child' : 'children'}`);
            }
          }
        } else if (parentPhone) {
          // No guardian existed yet — creating one is still handled inline
          // via updateStudent, same as before.
          await updateStudent({
            id: student.id,
            body: { parentPhone, parentName: parentName || undefined, parentEmail: parentEmail || undefined },
          }).unwrap();
        }
        toast.success('Student updated');
        setPendingGuardianChange(null);
        onClose();
        if (res.data.guardianPin) {
          setTempPasswordQueue([{
            kind: 'guardianPin',
            name: parentName || 'Parent',
            pin: res.data.guardianPin,
            emailed: true,
            roleLabel: 'Parent',
          }]);
        }
      } else {
        const res = await createStudent({
          ...core,
          parentPhone: parentPhone || undefined,
          parentName: parentName || undefined,
          parentEmail: parentEmail || undefined,
        }).unwrap();
        toast.success('Student added');
        onClose();
        // `pin` is now ALWAYS present on creation (paired with systemId as
        // the Login ID) — no more tempPassword/pin branching, since students
        // never have their own email/phone to send a temp password to.
        // guardianPin is separate: present only when a BRAND-NEW parent
        // account was just created alongside this student — same PIN-based
        // login mechanism, just no systemId (guardians use phone/email).
        const queue: TempPasswordInfo[] = [];
        if (res.data.pin) {
          queue.push({
            kind: 'pin',
            name: `${core.firstName} ${core.lastName}`,
            systemId: res.data.systemId || '',
            pin: res.data.pin,
          });
        }
        if (res.data.guardianPin) {
          queue.push({
            kind: 'guardianPin',
            name: parentName || 'Parent',
            pin: res.data.guardianPin,
            emailed: true,
            roleLabel: 'Parent',
          });
        }
        if (queue.length) setTempPasswordQueue(queue);
      }
    } catch (e: any) {
      setPendingGuardianChange(null);
      const message = getErrorMessage(e, 'Could not save student');
      toast.error(message);
      // Also highlight the specific field the backend flagged, so the user
      // doesn't have to re-read the whole form to find what to fix.
      const code = getErrorCode(e);
      if (code === 'DUPLICATE_ROLL') {
        setError('rollNumber', { type: 'server', message });
      } else if (code === 'DUPLICATE_PHONE') {
        setError('parentPhone', { type: 'server', message });
      } else if (code === 'DUPLICATE_EMAIL') {
        setError('parentEmail', { type: 'server', message });
      }
    }
  };

  const onResendCredentials = async (target: 'student' | 'parent') => {
    if (!student) return;
    setResendingTarget(target);
    try {
      const res = await resendCredentials({ id: student.id, target }).unwrap();
      setTempPasswordQueue((q) => [...q, target === 'parent'
        ? {
            kind: 'guardianPin',
            name: student.guardianName || 'Parent',
            pin: res.data.pin || '',
            emailed: true,
            roleLabel: 'Parent',
          }
        : {
            kind: 'password',
            name: `${student.firstName} ${student.lastName}`,
            phone: student.phone ?? '',
            tempPassword: res.data.tempPassword || '',
            emailed: true,
          }]);
      toast.success(`New login details sent to ${res.data.sentTo}`);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not resend credentials'));
    } finally {
      setResendingTarget(null);
    }
  };

  const onResetPin = async () => {
    if (!student) return;
    try {
      const res = await resetPin({ id: student.id }).unwrap();
      setTempPasswordQueue((q) => [...q, {
        kind: 'pin',
        name: `${student.firstName} ${student.lastName}`,
        systemId: student.systemId || '',
        pin: res.data.pin,
      }]);
      toast.success('PIN reset');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reset PIN'));
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Student' : 'Add Student'}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={18} />
            </SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {isEdit && student?.userId && (
              <div className="border-b border-border pb-4">
                <Label>Photo</Label>
                <div className="mt-2">
                  <PhotoUpload
                    userId={student.userId}
                    photoUrl={student.profilePhoto}
                    initials={`${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase()}
                  />
                </div>
              </div>
            )}
            {isEdit && student && (
              <div className="border-b border-border pb-4">
                <Label>Login credentials</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  This student logs in with their ID card&apos;s Login ID and a PIN. Resetting immediately replaces their current PIN.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={resettingPin}
                    disabled={resettingPin}
                    onClick={onResetPin}
                  >
                    <KeyRound size={14} /> Reset PIN
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={resending && resendingTarget === 'parent'}
                    disabled={resending || !student.guardianPhone}
                    onClick={() => onResendCredentials('parent')}
                    title={!student.guardianPhone ? 'No parent/guardian account on file' : undefined}
                  >
                    <KeyRound size={14} /> Resend parent login
                  </Button>
                </div>
              </div>
            )}
            {noClasses && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>
                  {classesOverride
                    ? `You're not assigned as the teacher of any ${terminology.classUnit.toLowerCase()} ${terminology.section.toLowerCase()} yet — ask an admin to assign you to one.`
                    // Tells the admin the actual root cause when it's terms,
                    // not classes — otherwise they'd go to the Classes page,
                    // hit the same wall there, and have to find their way to
                    // Academic Terms themselves as a second, undocumented hop.
                    : noActiveTerms
                      ? `Set up your academic year first (Academic Terms page), then create a ${terminology.classUnit.toLowerCase()} — students need both.`
                      : `Create a ${terminology.classUnit.toLowerCase()} first (${terminology.classUnitPlural} page) — students need a ${terminology.classUnit.toLowerCase()} and ${terminology.section.toLowerCase()}.`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rollNumber">Roll number</Label>
                <Input id="rollNumber" {...register('rollNumber')} />
                {errors.rollNumber && <p className="mt-1 text-xs text-danger">{errors.rollNumber.message}</p>}
              </div>
              <div>
                <Label htmlFor="admissionNumber">Admission no.</Label>
                <Input id="admissionNumber" {...register('admissionNumber')} />
                {errors.admissionNumber && (
                  <p className="mt-1 text-xs text-danger">{errors.admissionNumber.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{terminology.classUnit}</Label>
                <Controller
                  control={control}
                  name="classId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => { field.onChange(v); setValue('sectionId', ''); }}
                    >
                      <SelectTrigger><SelectValue placeholder={`Select ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.classId && <p className="mt-1 text-xs text-danger">{errors.classId.message}</p>}
              </div>
              <div>
                <Label>{sectionLabel}</Label>
                <Controller
                  control={control}
                  name="sectionId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!selectedClassId}>
                      <SelectTrigger><SelectValue placeholder={sectionLabel} /></SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sectionId && <p className="mt-1 text-xs text-danger">{errors.sectionId.message}</p>}
              </div>
            </div>

            <div>
              <Label>Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="mt-1 text-xs text-danger">{errors.gender.message}</p>}
            </div>

            {/* Not required, but shown on the printable ID card — see
                IdCardsView.tsx. Left optional here so a student/parent can
                also fill these in themselves via "My ID Card" instead of
                this being the only way. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} placeholder="House #, street, area" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div>
                <Label>Blood Group</Label>
                <Controller
                  control={control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="nationalIdNumber">{nationalIdLabel} Number</Label>
                <Controller
                  control={control}
                  name="nationalIdNumber"
                  render={({ field }) => (
                    <Input
                      id="nationalIdNumber"
                      dir="ltr"
                      placeholder="42101-1234567-1"
                      inputMode="numeric"
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      // Auto-inserts the dashes as digits are typed/pasted,
                      // so entering the 13 raw digits (e.g. 1620115034803)
                      // lands as 16201-1503480-3 without the admin adding
                      // the dashes by hand.
                      onChange={(e) => field.onChange(formatNationalId(e.target.value))}
                    />
                  )}
                />
                {errors.nationalIdNumber && (
                  <p className="mt-1 text-xs text-danger">{errors.nationalIdNumber.message}</p>
                )}
              </div>
            </div>

            {(
              <>
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parent / Guardian
                  </p>
                  {isEdit && !originalGuardian && (
                    <p className="-mt-1 mb-2 text-xs text-muted-foreground">
                      This student has no guardian on file yet — add one below.
                    </p>
                  )}
                  {isEdit && originalGuardian && (
                    <p className="-mt-1 mb-2 text-xs text-muted-foreground">
                      Changing the phone or email below changes this guardian&apos;s login — you&apos;ll be asked to confirm.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="parentPhone">Parent phone</Label>
                      <Controller
                        control={control}
                        name="parentPhone"
                        render={({ field }) => (
                          <PhoneInput
                            id="parentPhone"
                            international
                            labels={en}
                            defaultCountry="PK"
                            countryCallingCodeEditable={false}
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            placeholder="300 1234567"
                            className={errors.parentPhone ? 'PhoneInput-danger' : undefined}
                          />
                        )}
                      />
                      {errors.parentPhone && <p className="mt-1 text-xs text-danger">{errors.parentPhone.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="parentName">Parent name</Label>
                      <Input id="parentName" {...register('parentName')} />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="parentEmail">Parent email</Label>
                      <Input id="parentEmail" type="email" dir="ltr" {...register('parentEmail')} />
                      {errors.parentEmail && <p className="mt-1 text-xs text-danger">{errors.parentEmail.message}</p>}
                    </div>
                  </div>
                  {!originalGuardian && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      If a parent with this phone already has an account here, this student is just added to it — one login, both kids show up in it.
                      Otherwise a brand-new parent account is created and emailed its own login details — make sure this phone and email genuinely belong to the parent, since they&apos;ll use them to sign in.
                    </p>
                  )}
                </div>
                {!isEdit && (
                  <p className="text-xs text-muted-foreground">
                    A student login is created automatically — a Login ID and PIN are both generated by the system, no setup needed. Both are shown once right after saving, and the Login ID also prints on their ID card. The student can change their own PIN later from their account, and you can always look up, edit or reset either one afterward from the Student Logins page.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </SheetClose>
            <Button type="submit" loading={creating || updating || updatingGuardianContact} disabled={noClasses}>
              {isEdit ? 'Save changes' : 'Add student'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    {tempPasswordInfo && (
      <TempPasswordDialog
        open={!!tempPasswordInfo}
        onClose={dismissTempPasswordInfo}
        {...tempPasswordInfo}
      />
    )}

    {pendingGuardianChange && (
      <ConfirmDialog
        open={!!pendingGuardianChange}
        onClose={() => setPendingGuardianChange(null)}
        onConfirm={() => doSubmit(pendingGuardianChange)}
        title="Change guardian login details?"
        tone="warning"
        confirmLabel="Save changes"
        loading={updating || updatingGuardianContact}
        description={
          <>
            This changes the phone or email this guardian uses to log in.
            {' '}If this guardian is linked to other children, it changes their login too — everyone else stays as-is.
          </>
        }
      />
    )}
    </>
  );
}
