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
import { InfoNote } from '@/components/ui/info-note';
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
import { getInitials, cn, formatNationalId } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { getErrorMessage, getErrorCode, getErrorDetails } from '@/lib/get-error-message';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useBulkImportUsersMutation,
  type ManageableRole,
  type ManagedUser,
  type EmailDeliveryStatus,
} from '@/store/api/usersApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { InviteStatusBadge } from '@/components/users/InviteStatusBadge';
import { InviteSentDialog } from '@/components/users/InviteSentDialog';
import { DomainConfirmDialog } from '@/components/users/DomainConfirmDialog';
import { ResendInviteDialog } from '@/components/users/ResendInviteDialog';
import { PhotoUpload } from '@/components/shared/PhotoUpload';

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

/** Mirrors StudentsView.tsx's missingIdInfo() — fields the ID card feature
 *  needs, surfaced inline per row instead of only via the "Missing ID info"
 *  filter. */
function missingStaffInfo(m: ManagedUser): string[] {
  const missing: string[] = [];
  if (!m.address) missing.push('address');
  if (!m.profilePhoto) missing.push('photo');
  return missing;
}

export function StaffView() {
  const [role, setRole] = useState<'staff' | 'accountant'>(() =>
    typeof window === 'undefined'
      ? 'staff'
      : (new URLSearchParams(window.location.search).get('role') as 'staff' | 'accountant' | null) ?? 'staff'
  );
  const [query, setQuery] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') ?? ''
  );
  const [incompleteOnly, setIncompleteOnly] = useState(false);
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
    incomplete: incompleteOnly || undefined,
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

      <InfoNote title="How do they log in?">
        <p>Staff and accountants log in at the same <strong>Log in</strong> page as everyone else, using the phone or email entered when they were added. They&apos;re emailed an activation link and choose their own password the first time — there&apos;s no temporary password to hand out.</p>
        <p>Activation email never arrived? Use <strong>Resend invite</strong> on their row.</p>
      </InfoNote>

      <Tabs value={role} onValueChange={(v) => { setRole(v as 'staff' | 'accountant'); setPage(1); }}>
        <TabsList>
          {ROLE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon size={14} className="mr-1.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by name or phone…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => { setIncompleteOnly((v) => !v); setPage(1); }}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            incompleteOnly
              ? 'border-warning bg-warning-soft text-warning'
              : 'border-border bg-card text-foreground hover:bg-muted'
          )}
          title="Show only staff missing an address"
        >
          Missing ID info
        </button>
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title={`Couldn't load ${role === 'accountant' ? 'accountants' : 'staff'}`} action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : members.length === 0 ? (
        <Card>
          <EmptyState
            icon={role === 'accountant' ? Landmark : Briefcase}
            title={debounced || incompleteOnly ? 'No matches' : `No ${role === 'accountant' ? 'accountants' : 'staff members'} yet`}
            description={debounced || incompleteOnly ? 'Try a different search or filter.' : `Add your first ${roleLabelLower} to get started.`}
            action={!debounced && !incompleteOnly ? <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add {roleLabelLower}</Button> : undefined}
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
                          <Avatar
                            size="sm"
                            photoUrl={m.profilePhoto}
                            alt={m.name}
                            initials={getInitials(m.firstName, m.lastName)}
                          />
                          <div>
                            <span className="font-medium text-foreground">{m.name}</span>
                            {!m.address && (
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-warning">
                                <AlertCircle size={11} className="shrink-0" /> Missing address
                              </p>
                            )}
                          </div>
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
                  <Avatar
                    size="md"
                    photoUrl={m.profilePhoto}
                    alt={m.name}
                    initials={getInitials(m.firstName, m.lastName)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.phone}{m.email ? ` · ${m.email}` : ''}</p>
                    {missingStaffInfo(m).length > 0 && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-warning">
                        <AlertCircle size={11} className="shrink-0" /> Missing {missingStaffInfo(m).join(', ')}
                      </p>
                    )}
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
        helpText="Each row gets an activation link emailed to it, same as adding one person at a time — nobody gets a password chosen for them."
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
  address: z.string().optional(),
  // Staff are always adults regardless of institution type, so this is
  // always labeled "CNIC" (never "Form B") — same format as the student
  // field, matching the backend's NATIONAL_ID_REGEX exactly.
  nationalIdNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{5}-\d{7}-\d$/.test(v), 'Enter a valid CNIC in the format 42101-1234567-1'),
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
  const [inviteSentInfo, setInviteSentInfo] = useState<{ name: string; email: string; emailDeliveryStatus: EmailDeliveryStatus; emailDeliveryError: string | null } | null>(null);
  const [domainIssue, setDomainIssue] = useState<{ domain: string; email: string } | null>(null);
  const { register, control, handleSubmit, reset, getValues, formState: { errors } } = useForm<StaffForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', address: '', nationalIdNumber: '' },
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
        ? {
            firstName: editing.firstName,
            lastName: editing.lastName,
            phone: editing.phone,
            email: editing.email ?? '',
            address: editing.address ?? '',
            nationalIdNumber: editing.nationalIdNumber ?? '',
          }
        : { firstName: '', lastName: '', phone: '', email: '', address: '', nationalIdNumber: '' }
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
            {isEditing && editing && (
              <div className="border-b border-border pb-4">
                <Label>Photo</Label>
                <div className="mt-2">
                  <PhotoUpload
                    userId={editing.id}
                    photoUrl={editing.profilePhoto}
                    initials={`${editing.firstName[0] ?? ''}${editing.lastName[0] ?? ''}`.toUpperCase()}
                  />
                </div>
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

            {isEditing && (
              <div className="grid grid-cols-2 gap-3">
                {/* Not required — but shown on the printable ID card (see
                    StaffIdCardsView.tsx). Left optional so this person can
                    also fill it in themselves via "My ID Card" instead of
                    this being the only way. */}
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...register('address')} placeholder="House #, street, area" />
                </div>
                <div>
                  <Label htmlFor="nationalIdNumber">CNIC Number</Label>
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
                        // Auto-inserts the dashes as digits are typed/pasted
                        // — entering the 13 raw digits lands already in the
                        // 42101-1234567-1 shape the validator requires.
                        onChange={(e) => field.onChange(formatNationalId(e.target.value))}
                      />
                    )}
                  />
                  {errors.nationalIdNumber && (
                    <p className="mt-1 text-xs text-danger">{errors.nationalIdNumber.message}</p>
                  )}
                </div>
              </div>
            )}
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
              <>
                <p className="-mt-2 text-xs text-muted-foreground">
                  This is how this {roleLabel.toLowerCase()} will log in — double-check the phone and email are correct and actually theirs before saving.
                </p>
                <p className="text-xs text-muted-foreground">An activation link is emailed to them — they choose their own password when they click it.</p>
              </>
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
