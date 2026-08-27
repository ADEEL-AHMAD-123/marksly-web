'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, X, Users, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import { getInitials } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useBulkImportUsersMutation,
} from '@/store/api/usersApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';

const PAGE_SIZE = 20;

export function TeachersView() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkImport] = useBulkImportUsersMutation();
  const debounced = useDebounce(query, 350);

  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery({
    role: 'teacher',
    search: debounced || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const [updateUser] = useUpdateUserMutation();

  const teachers = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await updateUser({ id, body: { isActive: !isActive } }).unwrap();
      if (isActive) {
        const { unassignedSubjects, unassignedSections } = res.data;
        const notes: string[] = [];
        if (unassignedSubjects) notes.push(`${unassignedSubjects} subject(s)`);
        if (unassignedSections) notes.push(`${unassignedSections} class section(s)`);
        toast.success(notes.length ? `Teacher deactivated — unassigned from ${notes.join(' and ')}, reassign when ready` : 'Teacher deactivated');
      } else {
        toast.success('Teacher activated');
      }
    } catch {
      toast.error('Could not update teacher');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description={isLoading ? 'Loading…' : `${data?.meta?.total ?? teachers.length} teachers`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><Plus size={16} /> Import CSV</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Add teacher</Button>
          </>
        }
      />

      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by name or phone…"
        />
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title="Couldn't load teachers" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : teachers.length === 0 ? (
        <Card><EmptyState icon={Users} title={debounced ? 'No teachers match' : 'No teachers yet'} description={debounced ? 'Try a different search.' : 'Add your first teacher to get started.'} action={!debounced ? <Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Add teacher</Button> : undefined} /></Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Teacher</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
                            {getInitials(t.firstName, t.lastName)}
                          </span>
                          <span className="font-medium text-foreground">{t.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{t.email ?? '—'}</TableCell>
                      <TableCell><Badge variant={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(t.id, t.isActive)}>
                          {t.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          <div className="space-y-3 md:hidden">
            {teachers.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground">
                    {getInitials(t.firstName, t.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.phone}{t.email ? ` · ${t.email}` : ''}</p>
                  </div>
                  <Badge variant={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(t.id, t.isActive)}>
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous"><ChevronLeft size={16} /></Button>
              <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next"><ChevronRight size={16} /></Button>
            </div>
          </div>
        </div>
      )}

      <AddTeacherDrawer open={open} onClose={() => setOpen(false)} />

      <ImportCsvDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Teachers"
        columns={['firstName', 'lastName', 'phone', 'email']}
        sample={['Sara', 'Iqbal', '03007654321', 'sara@example.com']}
        filename="teachers-template.csv"
        onImport={async (csv) => (await bulkImport({ csv, role: 'teacher' }).unwrap()).data}
      />
    </div>
  );
}

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z
    .string()
    .min(1, 'Enter a valid phone number')
    .refine((v) => isValidPhoneNumber(v), 'Enter a valid phone number'),
  // Required — email is the only working self-service password-recovery
  // path (see auth.service.ts's forgotPassword()).
  email: z.string().email('Enter a valid email address'),
});
type TeacherForm = z.infer<typeof schema>;

function AddTeacherDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; phone: string; tempPassword: string; emailed: boolean } | null>(null);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<TeacherForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '' },
  });

  const onSubmit = async (values: TeacherForm) => {
    try {
      const res = await createUser({ ...values, role: 'teacher' }).unwrap();
      toast.success('Teacher added');
      reset();
      onClose();
      if (res.data.tempPassword) {
        setTempPasswordInfo({
          name: `${values.firstName} ${values.lastName}`,
          phone: values.phone,
          tempPassword: res.data.tempPassword,
          emailed: true,
        });
      }
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not add teacher'));
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Add Teacher</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" dir="ltr" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
            </div>
            <p className="text-xs text-muted-foreground">A login is created with a temporary password the teacher can reset.</p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Add teacher</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    {tempPasswordInfo && (
      <TempPasswordDialog
        open={!!tempPasswordInfo}
        onClose={() => setTempPasswordInfo(null)}
        {...tempPasswordInfo}
      />
    )}
    </>
  );
}
