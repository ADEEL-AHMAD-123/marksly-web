'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Plus, Upload, X, Users, BookOpen, Briefcase, Landmark, AlertCircle, ChevronLeft, ChevronRight,
  Pencil, Eye, EyeOff, KeyRound, Loader2, Send, Mail, MailWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { PageHeader } from '@/components/ui/page-header';
import { InfoNote } from '@/components/ui/info-note';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
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
  useLazyGetStaffPinQuery,
  useResetStaffPinMutation,
  useResendInviteMutation,
  type ManageableRole,
  type ManagedUser,
} from '@/store/api/usersApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { DomainConfirmDialog } from '@/components/users/DomainConfirmDialog';
import { PhotoUpload } from '@/components/shared/PhotoUpload';
import { StaffDetailDrawer } from './StaffDetailDrawer';

const PAGE_SIZE = 20;

type TabValue = 'all' | ManageableRole;

// A single config array drives the tab bar, icons, labels, and the empty
// state copy — a future 5th manageable role (e.g. "librarian") is a
// one-line addition here rather than a new hardcoded JSX branch anywhere
// in this file.
export const ROLE_TABS: { value: TabValue; label: string; icon: typeof Briefcase }[] = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'teacher', label: 'Teacher', icon: BookOpen },
  { value: 'staff', label: 'Staff', icon: Briefcase },
  { value: 'accountant', label: 'Accountant', icon: Landmark },
];

export const ROLE_META: Record<ManageableRole, { label: string; icon: typeof Briefcase }> = {
  teacher: { label: 'Teacher', icon: BookOpen },
  staff: { label: 'Staff member', icon: Briefcase },
  accountant: { label: 'Accountant', icon: Landmark },
};

// Falls back rather than throwing if `role` is ever something other than
// teacher/staff/accountant — the backend's list() now always scopes to
// exactly those three, but this guards against any future caller (or a
// stale cached response) passing something ROLE_META doesn't know about,
// so one bad row can't crash the whole table/card list again.
export function roleLabel(role: ManageableRole) {
  return (ROLE_META[role] ?? ROLE_META.staff).label;
}

/** Small badge summarizing whether this account can actually be reached by
 *  email — mirrors StudentsView.tsx's guardianEmailMeta/GuardianEmailBadge,
 *  folded in here so login-email delivery issues are visible right on this
 *  row instead of on the retired standalone Email Delivery Status page.
 *  No 'no_guardian' equivalent here — every row here always represents one
 *  actual account with a phone/email of its own. */
const staffEmailMeta: Record<
  NonNullable<ManagedUser['emailStatus']>,
  { icon: typeof Mail; label: string; className: string; title: string }
> = {
  ok: { icon: Mail, label: 'Email OK', className: 'text-success', title: 'Login email was delivered fine' },
  problem: { icon: MailWarning, label: 'Email delivery failed', className: 'text-danger', title: 'The latest login email failed or bounced' },
  no_email: { icon: MailWarning, label: 'No email', className: 'text-warning', title: 'No email on file — nothing was ever sent' },
};

/** Hidden for 'ok' to keep rows calm — only surfaces when there's something
 *  worth noticing, same threshold as StudentsView.tsx's GuardianEmailBadge. */
export function StaffEmailBadge({ status }: { status?: ManagedUser['emailStatus'] }) {
  if (!status || status === 'ok') return null;
  const meta = staffEmailMeta[status];
  const Icon = meta.icon;
  return (
    <p className={cn('mt-0.5 flex items-center gap-1 text-[11px] font-medium', meta.className)} title={meta.title}>
      <Icon size={11} className="shrink-0" /> {meta.label}
    </p>
  );
}

/** Mirrors StudentsView.tsx's missingIdInfo() — fields the ID card feature
 *  needs, surfaced inline per row instead of only via the "Missing ID info"
 *  filter. */
export function missingStaffInfo(m: ManagedUser): string[] {
  const missing: string[] = [];
  if (!m.address) missing.push('address');
  if (!m.profilePhoto) missing.push('photo');
  return missing;
}

/** Reveal-on-demand state for a staff-type account's own PIN — same pattern
 *  as ClassRosterView.tsx's useStudentPinReveal, shared between the desktop
 *  row and the mobile card so the interaction stays identical in both. */
export function useStaffPinReveal(userId: string) {
  const [revealed, setRevealed] = useState<string | null | 'loading'>(null);
  const [triggerGetPin] = useLazyGetStaffPinQuery();
  const onReveal = async () => {
    if (revealed && revealed !== 'loading') { setRevealed(null); return; }
    setRevealed('loading');
    try {
      const res = await triggerGetPin(userId).unwrap();
      setRevealed(res.data.pin);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not fetch PIN'));
      setRevealed(null);
    }
  };
  return { revealed, onReveal };
}

/** Small inline reveal/hide control — a masked PIN plus a Reveal/Hide
 *  button, or "Not viewable" once the account holder has set their own
 *  PIN (pinState === 'staff_set', no longer decryptable server-side). */
export function PinCell({ member }: { member: ManagedUser }) {
  const { revealed, onReveal } = useStaffPinReveal(member.id);
  if (member.pinState === 'staff_set') {
    return <span className="text-xs text-muted-foreground">Self-set (not viewable)</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {revealed && revealed !== 'loading' && (
        <span dir="ltr" className="font-mono text-sm font-semibold tracking-wide">{revealed ?? '—'}</span>
      )}
      <Button size="sm" variant="ghost" onClick={onReveal}>
        {revealed === 'loading' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : revealed ? (
          <EyeOff size={14} />
        ) : (
          <Eye size={14} />
        )}
        {revealed && revealed !== 'loading' ? 'Hide' : 'Reveal'}
      </Button>
    </div>
  );
}

export function StaffManagementView() {
  const [tab, setTab] = useState<TabValue>(() =>
    typeof window === 'undefined' ? 'all' : (new URLSearchParams(window.location.search).get('tab') as TabValue | null) ?? 'all'
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

  // Omitting `role` returns every manageable role combined (see
  // user.service.ts's list()) — that's how the "All" tab is powered,
  // rather than issuing three separate requests and merging client-side.
  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery({
    role: tab === 'all' ? undefined : tab,
    search: debounced || undefined,
    page,
    limit: PAGE_SIZE,
    incomplete: incompleteOnly || undefined,
  });
  const [detailMember, setDetailMember] = useState<ManagedUser | null>(null);

  const members = data?.data ?? [];
  const total = data?.meta?.total ?? members.length;
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeTab = ROLE_TABS.find((t) => t.value === tab) ?? ROLE_TABS[0];
  const listLabel = tab === 'all' ? 'staff' : `${roleLabel(tab).toLowerCase()}s`;
  const filtersActive = !!debounced || tab !== 'all' || incompleteOnly;
  const resetFilters = () => {
    setQuery('');
    setTab('all');
    setIncompleteOnly(false);
    setPage(1);
  };
  const showResults = !isError && !isLoading && members.length > 0;
  const openEdit = (m: ManagedUser) => { setDetailMember(null); setEditing(m); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={isLoading ? 'Loading…' : `${total} ${listLabel}`}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setImportOpen(true)}
                title="Add many accounts at once by uploading a CSV spreadsheet"
              >
                <Upload size={16} /> Import from CSV
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => { setEditing(null); setOpen(true); }}
            >
              <Plus size={16} /> Add
            </Button>
          </div>
        }
      />

      {/* One merged panel, matching StudentsView.tsx exactly: role tabs
          directly above, then search/filter row, table/list, pagination —
          all inside a single bordered/shadowed container instead of a
          separately-boxed Tabs bar, filter Card, and floating pagination. */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); }}>
        <TabsList>
          {ROLE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon size={14} className="mr-1.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-[200px] flex-1">
            <SearchInput
              value={query}
              onChange={(v) => { setQuery(v); setPage(1); }}
              placeholder="Search by name or phone…"
            />
          </div>
          <button
            type="button"
            onClick={() => { setIncompleteOnly((v) => !v); setPage(1); }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              incompleteOnly
                ? 'border-warning bg-warning-soft text-warning'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
            title="Show only accounts missing an address"
          >
            Missing ID info
          </button>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>

        {isError ? (
          <EmptyState
            icon={AlertCircle}
            title={`Couldn't load ${listLabel}`}
            description="There was a problem reaching the server. Check that the API is running and try again."
            action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
          />
        ) : isLoading ? (
          <LoadingState />
        ) : members.length === 0 ? (
          <EmptyState
            icon={activeTab.icon}
            title={filtersActive ? 'No matches' : `No ${listLabel} yet`}
            description={filtersActive ? 'Try adjusting your search or clearing the filters.' : 'Add your first account to get started.'}
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add</Button>
              )
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Desktop table — bare Table wrapped in the scroll container,
                matching StudentsView.tsx (no separately-bordered
                TableWrapper nesting inside this panel's own border). */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    {tab === 'all' && <TableHead>Role</TableHead>}
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="cursor-pointer" onClick={() => setDetailMember(m)}>
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
                      {tab === 'all' && (
                        <TableCell><Badge variant="neutral">{roleLabel(m.role)}</Badge></TableCell>
                      )}
                      <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.email ?? '—'}
                        <StaffEmailBadge status={m.emailStatus} />
                      </TableCell>
                      <TableCell><Badge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}><PinCell member={m} /></TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          View <ChevronRight size={14} />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile rows — divided clickable list rows, matching
                StudentsView.tsx's mobile block instead of individually
                boxed cards with their own inline action buttons. */}
            <div className="divide-y divide-border md:hidden">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 p-4 active:bg-muted/40"
                  onClick={() => setDetailMember(m)}
                >
                  <Avatar
                    size="md"
                    photoUrl={m.profilePhoto}
                    alt={m.name}
                    initials={getInitials(m.firstName, m.lastName)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-foreground/70">
                      {m.phone}{m.email ? ` · ${m.email}` : ''}
                    </p>
                    <StaffEmailBadge status={m.emailStatus} />
                    {missingStaffInfo(m).length > 0 && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-warning">
                        <AlertCircle size={11} className="shrink-0" /> Missing {missingStaffInfo(m).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {tab === 'all' && <Badge variant="neutral">{roleLabel(m.role)}</Badge>}
                    <Badge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Active' : 'Inactive'}</Badge>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">
                      View <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showResults && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
              <span className="ml-1.5">· {total} {listLabel}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Button>
              <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={16} /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Help / reference — placed below the primary task, matching
          StudentsView.tsx's InfoNote placement (after the results panel,
          before the drawers) rather than above the tabs/filters. */}
      <div className="space-y-2">
        <InfoNote title="How do staff log in?">
          <p>
            Teachers, staff, and accountants all log in the same way — a Login ID and PIN, generated automatically
            the moment their account is created. Both are shown once right after creation, and can be looked up
            again anytime from this table.
          </p>
        </InfoNote>
        <InfoNote title="Where do I look up or reset a login PIN?">
          <p>
            Every account&apos;s PIN status is shown in the account&apos;s details — open a row and use{' '}
            <strong>Reveal</strong> to see it, or <strong>Reset</strong> to generate a new one (or set a specific
            one) if it was lost or the person set their own PIN and can no longer be told the current one.
          </p>
        </InfoNote>
        <InfoNote title="A login email never arrived?">
          <p>
            The email is only a convenience for handing someone their PIN — it never blocks their login, so a
            missing or bounced email doesn&apos;t stop them from signing in with their Login ID and PIN. Open the
            account and use <strong>Resend login email</strong> to try again, or reveal/reset the PIN and hand it
            over directly.
          </p>
        </InfoNote>
      </div>

      <AddStaffDrawer
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        defaultRole={tab === 'all' ? 'teacher' : tab}
        editing={editing}
      />

      <StaffDetailDrawer
        member={detailMember}
        open={!!detailMember}
        onClose={() => setDetailMember(null)}
        onEdit={openEdit}
      />

      <ImportCsvDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={tab === 'all' ? 'Import Staff' : `Import ${roleLabel(tab)}s`}
        columns={['firstName', 'lastName', 'phone', 'email']}
        sample={['Bilal', 'Ahmed', '03007654321', 'bilal@example.com']}
        filename={`${tab === 'all' ? 'staff' : tab}-template.csv`}
        helpText="Each row gets a Login ID and PIN emailed to it, same as adding one person at a time."
        onImport={async (csv) => (await bulkImport({ csv, role: tab === 'all' ? 'teacher' : tab }).unwrap()).data}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Resets (or sets a custom) PIN for a staff-type account — same
 *  random/custom choice and reveal-once flow as ClassRosterView.tsx's
 *  ResetPinDialog for students. */
export function ResetPinDialog({ userId, name, systemId, onClose }: { userId: string; name: string; systemId?: string | null; onClose: () => void }) {
  const [resetPin, { isLoading }] = useResetStaffPinMutation();
  const [mode, setMode] = useState<'random' | 'custom'>('random');
  const [customPin, setCustomPin] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const validCustom = mode === 'random' || (customPin.length >= 4 && customPin.length <= 6);

  const onSubmit = async () => {
    try {
      const res = await resetPin({ id: userId, customPin: mode === 'custom' ? customPin : undefined }).unwrap();
      setResult(res.data.pin);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not reset PIN'));
    }
  };

  if (result) {
    return <TempPasswordDialog open onClose={onClose} name={name} systemId={systemId ?? undefined} pin={result} />;
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">Reset PIN — {name}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('random')}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', mode === 'random' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground')}
              >
                Random PIN
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', mode === 'custom' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground')}
              >
                Custom PIN
              </button>
            </div>
            {mode === 'custom' && (
              <div>
                <Label htmlFor="custom-pin">New PIN (4-6 digits)</Label>
                <Input
                  id="custom-pin"
                  dir="ltr"
                  inputMode="numeric"
                  value={customPin}
                  onChange={(e) => setCustomPin(digitsOnly(e.target.value))}
                  placeholder="e.g. 1234"
                />
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!validCustom || isLoading} loading={isLoading} onClick={onSubmit}>
              Reset PIN
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Re-sends the account's login PIN by email — informational only now (the
 *  account can already log in), not an activation step. Replaces the old
 *  ResendInviteDialog copy accordingly. */
export function ResendLoginEmailDialog({
  userId, name, currentEmail, onClose,
}: { userId: string; name: string; currentEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(currentEmail);
  const [domainIssue, setDomainIssue] = useState<{ domain: string; email: string } | null>(null);
  const [resendInvite, { isLoading }] = useResendInviteMutation();

  const submit = async (confirmUnverifiedEmail?: boolean) => {
    try {
      await resendInvite({
        id: userId,
        email: email !== currentEmail ? email : undefined,
        confirmUnverifiedEmail,
      }).unwrap();
      toast.success(`Login email resent to ${email}`);
      setDomainIssue(null);
      onClose();
    } catch (e: any) {
      if (getErrorCode(e) === 'EMAIL_DOMAIN_UNVERIFIED') {
        const details = getErrorDetails<{ domain: string; email: string }>(e);
        if (details) {
          setDomainIssue(details);
          return;
        }
      }
      toast.error(getErrorMessage(e, 'Could not resend login email'));
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={!domainIssue} onOpenChange={(o) => !o && onClose()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                <Send size={15} />
              </span>
              <DialogPrimitive.Title className="text-base font-semibold">Resend login email to {name}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              Confirm or fix the email address below — they can already log in with their existing PIN, this just
              re-sends it as a reminder.
            </DialogPrimitive.Description>

            <div className="mt-4">
              <Label htmlFor="resend-email">Email</Label>
              <Input id="resend-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
              <Button size="sm" loading={isLoading} onClick={() => submit()}>Resend</Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {domainIssue && (
        <DomainConfirmDialog
          open
          domain={domainIssue.domain}
          email={domainIssue.email}
          loading={isLoading}
          onCancel={() => setDomainIssue(null)}
          onConfirm={() => submit(true)}
        />
      )}
    </>
  );
}

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z
    .string()
    .min(1, 'Enter a valid phone number')
    .refine((v) => isValidPhoneNumber(v), 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['teacher', 'staff', 'accountant']),
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
  open, onClose, defaultRole, editing,
}: { open: boolean; onClose: () => void; defaultRole: ManageableRole; editing: ManagedUser | null }) {
  const isEditing = !!editing;
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const isLoading = creating || updating;
  const [createdInfo, setCreatedInfo] = useState<{ name: string; systemId: string | null; pin: string; role: ManageableRole } | null>(null);
  const [domainIssue, setDomainIssue] = useState<{ domain: string; email: string } | null>(null);
  const { register, control, handleSubmit, reset, getValues, formState: { errors } } = useForm<StaffForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', role: defaultRole, address: '', nationalIdNumber: '' },
  });

  // Re-seed the form every time the drawer opens — either with the row
  // being edited, or blank for a fresh "Add". Keying off `open` (not just
  // `editing`) is what actually fixes the earlier stale-values bug: this
  // drawer is shared across every tab and both the add and edit flows, so
  // it must never trust whatever was left in the form from the last time
  // it was open.
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            firstName: editing.firstName,
            lastName: editing.lastName,
            phone: editing.phone,
            email: editing.email ?? '',
            role: editing.role,
            address: editing.address ?? '',
            nationalIdNumber: editing.nationalIdNumber ?? '',
          }
        : { firstName: '', lastName: '', phone: '', email: '', role: defaultRole, address: '', nationalIdNumber: '' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const submit = async (values: StaffForm, confirmUnverifiedEmail?: boolean) => {
    const label = roleLabel(values.role);
    try {
      if (isEditing) {
        // Role is fixed once created — only the base contact/card fields
        // are ever sent on update, matching the backend's update() which
        // never accepts a role change.
        const { role: _role, ...rest } = values;
        await updateUser({ id: editing.id, body: rest }).unwrap();
        toast.success(`${label} updated`);
        onClose();
        return;
      }
      const res = await createUser({ ...values, confirmUnverifiedEmail }).unwrap();
      toast.success(`${label} added`);
      setDomainIssue(null);
      onClose();
      setCreatedInfo({
        name: `${values.firstName} ${values.lastName}`,
        systemId: res.data.systemId,
        pin: res.data.pin,
        role: values.role,
      });
    } catch (e: any) {
      if (!isEditing && getErrorCode(e) === 'EMAIL_DOMAIN_UNVERIFIED') {
        const details = getErrorDetails<{ domain: string; email: string }>(e);
        if (details) {
          setDomainIssue(details);
          return;
        }
      }
      toast.error(getErrorMessage(e, `Could not ${isEditing ? 'update' : 'add'} ${label.toLowerCase()}`));
    }
  };

  const onSubmit = (values: StaffForm) => submit(values);

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{isEditing ? `Edit ${roleLabel(editing.role)}` : 'Add account'}</h2>
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

            {!isEditing && (
              <div>
                <Label htmlFor="role">Role</Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
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
              <p className="text-xs text-muted-foreground">A Login ID and PIN are generated automatically and emailed to this address — shown once here as well right after saving.</p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>{isEditing ? 'Save changes' : 'Add'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    {createdInfo && (
      <TempPasswordDialog
        open={!!createdInfo}
        onClose={() => setCreatedInfo(null)}
        name={createdInfo.name}
        systemId={createdInfo.systemId ?? undefined}
        pin={createdInfo.pin}
        roleLabel={roleLabel(createdInfo.role)}
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
