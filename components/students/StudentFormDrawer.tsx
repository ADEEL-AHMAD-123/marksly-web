'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle } from 'lucide-react';
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
import { useGetClassesQuery } from '@/store/api/classesApi';
import {
  useCreateStudentMutation,
  useUpdateStudentMutation,
  type StudentListItem,
} from '@/store/api/studentsApi';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  // Editing an existing student whose phone predates this country-aware
  // input may still hold a legacy local-format value — only enforce strict
  // E.164 validation once it looks like it went through the new field
  // (starts with "+"), same relaxation as the profile settings form.
  phone: z
    .string()
    .min(1, 'Enter a valid phone number')
    .refine((v) => !v.startsWith('+') || isValidPhoneNumber(v), 'Enter a valid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  rollNumber: z.string().min(1, 'Required'),
  admissionNumber: z.string().min(1, 'Required'),
  classId: z.string().min(1, 'Select a class'),
  sectionId: z.string().min(1, 'Select a section'),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Select gender' }),
  }),
  // Guardian phone is what the absentee-report WhatsApp links (see
  // AttendanceReportView.tsx) actually message — capturing it in E.164 up
  // front means those links work without any later phone-normalization
  // guesswork.
  parentPhone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  parentName: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  student?: StudentListItem | null;
}

export function StudentFormDrawer({ open, onClose, student }: Props) {
  const isEdit = !!student;
  const { data: classesRes } = useGetClassesQuery();
  const classes = useMemo(() => classesRes?.data ?? [], [classesRes]);
  const [createStudent, { isLoading: creating }] = useCreateStudentMutation();
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '', lastName: '', phone: '', email: '',
      rollNumber: '', admissionNumber: '', classId: '', sectionId: '', gender: 'male',
      parentPhone: '', parentName: '',
    },
  });

  const selectedClassId = watch('classId');
  const sections = useMemo(
    () => classes.find((c) => c.id === selectedClassId)?.sections ?? [],
    [classes, selectedClassId]
  );

  // Prefill on open
  useEffect(() => {
    if (!open) return;
    if (student) {
      const cls = classes.find((c) => c.name === student.className);
      const sec = cls?.sections.find((s) => s.name === student.section);
      reset({
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone ?? '',
        email: '',
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        classId: cls?.id ?? '',
        sectionId: sec?.id ?? '',
        gender: student.gender,
      });
    } else {
      reset({
        firstName: '', lastName: '', phone: '', email: '',
        rollNumber: '', admissionNumber: '', classId: '', sectionId: '', gender: 'male',
        parentPhone: '', parentName: '',
      });
    }
  }, [open, student, classes, reset]);

  const noClasses = classes.length === 0;

  const onSubmit = async (values: Form) => {
    const { parentPhone, parentName, ...core } = values;
    try {
      if (isEdit && student) {
        await updateStudent({ id: student.id, body: { ...core, email: core.email || undefined } }).unwrap();
        toast.success('Student updated');
      } else {
        await createStudent({
          ...core,
          email: core.email || undefined,
          parentPhone: parentPhone || undefined,
          parentName: parentName || undefined,
        }).unwrap();
        toast.success('Student added');
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save student');
    }
  };

  return (
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
            {noClasses && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>Create a class first (Classes page) — students need a class and section.</span>
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
                    countryCallingCodeEditable={false}
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? '')}
                    placeholder="300 1234567"
                    className={errors.phone ? 'PhoneInput-danger' : undefined}
                  />
                )}
              />
              {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone.message}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" dir="ltr" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
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
                <Label>Class</Label>
                <Controller
                  control={control}
                  name="classId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => { field.onChange(v); setValue('sectionId', ''); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
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
                <Label>Section</Label>
                <Controller
                  control={control}
                  name="sectionId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!selectedClassId}>
                      <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
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

            {!isEdit && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent / Guardian (optional)</p>
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
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    If a parent with this phone exists they&apos;ll be linked; otherwise a parent account is created automatically.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  A student login is created automatically with a temporary password (the student can reset it).
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </SheetClose>
            <Button type="submit" loading={creating || updating} disabled={noClasses}>
              {isEdit ? 'Save changes' : 'Add student'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
