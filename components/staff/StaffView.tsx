'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, X, Briefcase, Landmark, AlertCircle, ChevronLeft, ChevronRight, Pencil,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import { getInitials } from '@/lib/utils';
import { getErrorMessage, getErrorCode, getErrorDetails } from '@/lib/get-error-message';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useBulkImportUsersMutation,
  type ManageableRole,
  type ManagedUser,
} from '@/store/api/usersApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { InviteStatusBadge } from '@/components/users/InviteStatusBadge';
import { InviteSentDialog } from '@/components/users/InviteSentDialog';
import { DomainConfirmDialog } from '@/components/users/DomainConfirmDialog';
import { ResendInviteDialog } from '@/components/users/ResendInviteDialog';

const PAGE_SIZE = 20;

// 'teacher' has its own dedicated page (Teachers) — this view covers the
// other two manageable roles, which share an identical CRUD shape on the
// backend (usersApi.ts's ManageableRole/CreateUserBody are already role-
// generic) and previously had no creation UI at all despite being fully
// supported server-side.
const ROLE_TABS: { value: 'staff' | 'accountant'; label: string; icon: typeof Briefcase }[] = [
  { value: 'staff', label: 'Staff', icon: Briefcase },
  { value: 'accountant', label: 'Accountant', icon: Landmark },
];

export function StaffView() {
  const [role, setRole] = useState<'staff' | 'accountant'>('staff');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkImport] = useBulkImportUsersMutation();
  const debounced = useDebounce(query, 350);

  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery({
    role,
    search: debounced || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const [updateUser] = useUpdateUserMutation();
  const [resendTarget, setResendTarget] = useState<{ id: string; name: string; email: string } | null>(null);

  const members = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const roleLabel = role === 'accountant' ? 'Accountant' : 'Staff member';
  const roleLabelLower = role === 'accountant' ? 'accountant' : 'staff member';

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateUser({ id, body: { isActive: !isActive } }).unwrap();
      toast.success(isActive ? `${roleLabel} deactivated` : `${roleLabel} activated`);
    } catch {
      toast.error(`Could not update ${roleLabelLower}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={isLoading ? 'Loading…' : `${data?.meta?.total ?? members.length} ${role === 'accountant' ? 'accountants' : 'staff members'}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><Plus size={16} /> Import CSV</Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add {roleLabelLower}</Button>
          </>
        }
      />

      <Tabs value={role} onValueChange={(v) => { setRole(v as 'staff' | 'accountant'); setPage(1); }}>
        <TabsList>
          {ROLE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon size={14} className="mr-1.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by name or phone…"
        />
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title={`Couldn't load ${role === 'accountant' ? 'accountants' : 'staff'}`} action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : members.length === 0 ? (
        <Card>
          <EmptyState
            icon={role === 'accountant' ? Landmark : Briefcase}
            title={debounced ? 'No matches' : `No ${role === 'accountant' ? 'accountants' : 'staff members'} yet`}
            description={debounced ? 'Try a different search.' : `Add your first ${roleLabelLower} to get started.`}
            action={!debounced ? <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add {roleLabelLower}</Button> : undefined}
          />
        </Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{roleLabel}</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
                            {getInitials(m.firstName, m.lastName)}
                          </span>
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email ?? '—'}</TableCell>
                      <TableCell><Badge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <InviteStatusBadge emailVerified={m.emailVerified} emailDeliveryStatus={m.emailDeliveryStatus} emailDeliveryError={m.emailDeliveryError} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setOpen(true); }}>
                            <Pencil size={14} /> Edit
                          </Button>
                          {!m.emailVerified && m.email && (
                            <Button variant="ghost" size="sm" onClick={() => setResendTarget({ id: m.id, name: m.name, email: m.email! })}>
                              Resend invite
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(m.id, m.isActive)}>
                            {m.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground">
                    {getInitials(m.firstName, m.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.phone}{m.email ? ` · ${m.email}` : ''}</p>
                  </div>
                  <Badge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="mt-2">
                  <InviteStatusBadge emailVerified={m.emailVerified} emailDeliveryStatus={m.emailDeliveryStatus} emailDeliveryError={m.emailDeliveryError} />
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setOpen(true); }}>
                    <Pencil size={14} /> Edit
                  </Button>
                  {!m.emailVerified && m.email && (
                    <Button variant="ghost" size="sm" onClick={() => setResendTarget({ id: m.id, name: m.name, email: m.email! })}>
                      Resend invite
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(m.id, m.isActive)}>
                    {m.isActive ? 'Deactivate' : 'Activate'}
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

      <AddStaffDrawer
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        role={role}
        roleLabel={roleLabel}
        editing={editing}
      />

      {resendTarget && (
        <ResendInviteDialog
          open={!!resendTarget}
          onClose={() => setResendTarget(null)}
          userId={resendTarget.id}
          name={resendTarget.name}
          currentEmail={resendTarget.email}
        />
      )}

      <ImportCsvDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={`Import ${role === 'accountant' ? 'Accountants' : 'Staff'}`}
        columns={['firstName', 'lastName', 'phone', 'email']}
        sample={['Bilal', 'Ahmed', '03007654321', 'bilal@example.com']}
        filename={`${role}-template.csv`}
        onImport={async (csv) => (await bulkImport({ csv, role }).unwrap()).data}
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
type StaffForm = z.infer<typeof schema>;

function AddStaffDrawer({
  open, onClose, role, roleLabel, editing,
}: { open: boolean; onClose: () => void; role: ManageableRole; roleLabel: string; editing: ManagedUser | null }) {
  const isEditing = !!editing;
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const isLoading = creating || updating;
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; phone: string; tempPassword: string; emailed: boolean } | null>(null);
  const [inviteSentInfo, setInviteSentInfo] = useState<{ name: string; email: string; emailDeliveryStatus: any; emailDeliveryError: string | null } | null>(null);
  const [domainIssue, setDomainIssue] = useState<{ domain: string; email: string } | null>(null);
  const { register, control, handleSubmit, reset, getValues, formState: { errors } } = useForm<StaffForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '' },
  });

  // Re-seed the form every time the drawer opens — either with the row
  // being edited, or blank for a fresh "Add". Keying off `open` (not just
  // `editing`) is what actually fixes the earlier stale-values bug: this
  // drawer is shared by both the Staff and Accountant tabs and by both the
  // add and edit flows, so it must never trust whatever was left in the
  // form from the last time it was open.
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? { firstName: editing.firstName, lastName: editing.lastName, phone: editing.phone, email: editing.email ?? '' }
        : { firstName: '', lastName: '', phone: '', email: '' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const submit = async (values: StaffForm, confirmUnverifiedEmail?: boolean) => {
    try {
      if (isEditing) {
        await updateUser({ id: editing.id, body: { ...values, role } }).unwrap();
        toast.success(`${roleLabel} updated`);
        onClose();
        return;
      }
      const res = await createUser({ ...values, role, confirmUnverifiedEmail }).unwrap();
      toast.success(`${roleLabel} added`);
      setDomainIssue(null);
      onClose();
      if (res.data.tempPassword) {
        setTempPasswordInfo({
          name: `${values.firstName} ${values.lastName}`,
          phone: values.phone,
          tempPassword: res.data.tempPassword,
          emailed: true,
        });
      } else {
        setInviteSentInfo({
          name: `${values.firstName} ${values.lastName}`,
          email: values.email,
          emailDeliveryStatus: res.data.emailDeliveryStatus,
          emailDeliveryError: res.data.emailDeliveryError,
        });
      }
    } catch (e: any) {
      if (!isEditing && getErrorCode(e) === 'EMAIL_DOMAIN_UNVERIFIED') {
        const details = getErrorDetails<{ domain: string; email: string }>(e);
        if (details) {
          setDomainIssue(details);
          return;
        }
      }
      toast.error(getErrorMessage(e, `Could not ${isEditing ? 'update' : 'add'} ${roleLabel.toLowerCase()}`));
    }
  };

  const onSubmit = (values: StaffForm) => submit(values);

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{isEditing ? `Edit ${roleLabel}` : `Add ${roleLabel}`}</h2>
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
            {!isEditing && (
              <p className="text-xs text-muted-foreground">An activation link is emailed to them — they choose their own password when they click it.</p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>{isEditing ? 'Save changes' : `Add ${roleLabel.toLowerCase()}`}</Button>
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

    {inviteSentInfo && (
      <InviteSentDialog
        open={!!inviteSentInfo}
        onClose={() => setInviteSentInfo(null)}
        {...inviteSentInfo}
      />
    )}

    {domainIssue && (
      <DomainConfirmDialog
        open
        domain={domainIssue.domain}
        email={domainIssue.email}
        loading={isLoading}
        onCancel={() => setDomainIssue(null)}
        onConfirm={() => submit(getValues(), true)}
      />
    )}
    </>
  );
}
