'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Plus, X, Users, BookOpen, Briefcase, Landmark, AlertCircle, ChevronLeft, ChevronRight,
  Pencil, Eye, EyeOff, KeyRound, Loader2, Send,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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
  useLazyGetStaffPinQuery,
  useResetStaffPinMutation,
  useResendInviteMutation,
  type ManageableRole,
  type ManagedUser,
} from '@/store/api/usersApi';
import { ImportCsvDrawer } from '@/components/ui/import-csv-drawer';
import { DomainConfirmDialog } from '@/components/users/DomainConfirmDialog';
import { PhotoUpload } from '@/components/shared/PhotoUpload';

const PAGE_SIZE = 20;

type TabValue = 'all' | ManageableRole;

// A single config array drives the tab bar, icons, labels, and the empty
// state copy — a future 5th manageable role (e.g. "librarian") is a
// one-line addition here rather than a new hardcoded JSX branch anywhere
// in this file.
const ROLE_TABS: { value: TabValue; label: string; icon: typeof Briefcase }[] = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'teacher', label: 'Teacher', icon: BookOpen },
  { value: 'staff', label: 'Staff', icon: Briefcase },
  { value: 'accountant', label: 'Accountant', icon: Landmark },
];

const ROLE_META: Record<ManageableRole, { label: string; icon: typeof Briefcase }> = {
  teacher: { label: 'Teacher', icon: BookOpen },
  staff: { label: 'Staff member', icon: Briefcase },
  accountant: { label: 'Accountant', icon: Landmark },
};

function roleLabel(role: ManageableRole) {
  return ROLE_META[role].label;
}

/** Mirrors StudentsView.tsx's missingIdInfo() — fields the ID card feature
 *  needs, surfaced inline per row instead of only via the "Missing ID info"
 *  filter. */
function missingStaffInfo(m: ManagedUser): string[] {
  const missing: string[] = [];
  if (!m.address) missing.push('address');
  if (!m.profilePhoto) missing.push('photo');
  return missing;
}

/** Reveal-on-demand state for a staff-type account's own PIN — same pattern
 *  as ClassRosterView.tsx's useStudentPinReveal, shared between the desktop
 *  row and the mobile card so the interaction stays identical in both. */
function useStaffPinReveal(userId: string) {
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
function PinCell({ member }: { member: ManagedUser }) {
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
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [resendTarget, setResendTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);

  const members = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeTab = ROLE_TABS.find((t) => t.value === tab) ?? ROLE_TABS[0];
  const listLabel = tab === 'all' ? 'staff' : `${roleLabel(tab).toLowerCase()}s`;

  const toggleActive = async (m: ManagedUser) => {
    try {
      const res = await updateUser({ id: m.id, body: { isActive: !m.isActive } }).unwrap();
      setConfirmDeactivateId(null);
      if (m.isActive) {
        // Teacher-specific: deactivating unassigns them from any subjects
        // (and, historically, sections) they were teaching — carried over
        // from the old TeachersView.tsx so this warning isn't lost for the
        // one role it actually applies to.
        if (m.role === 'teacher') {
          const { unassignedSubjects, unassignedSections } = res.data;
          const notes: string[] = [];
          if (unassignedSubjects) notes.push(`${unassignedSubjects} subject(s)`);
          if (unassignedSections) notes.push(`${unassignedSections} class section(s)`);
          toast.success(notes.length ? `Teacher deactivated — unassigned from ${notes.join(' and ')}, reassign when ready` : 'Teacher deactivated');
        } else {
          toast.success(`${roleLabel(m.role)} deactivated`);
        }
      } else {
        toast.success(`${roleLabel(m.role)} activated`);
      }
    } catch (e: any) {
      toast.error(getErrorMessage(e, `Could not update ${roleLabel(m.role).toLowerCase()}`));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={isLoading ? 'Loading…' : `${data?.meta?.total ?? members.length} ${listLabel}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><Plus size={16} /> Import CSV</Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add</Button>
          </>
        }
      />

      <InfoNote title="How do staff log in?">
        <p>
          Teachers, staff, and accountants all log in the same way — a Login ID and PIN, generated automatically
          the moment their account is created. Both are shown once right after creation, and can be looked up
          again anytime from this table.
        </p>
      </InfoNote>
      <InfoNote title="Where do I look up or reset a login PIN?">
        <p>
          Every account&apos;s PIN status is shown right here in the table — click <strong>Reveal</strong> to see
          it, or <strong>Reset PIN</strong> to generate a new one (or set a specific one) if it was lost or the
          person set their own PIN and can no longer be told the current one.
        </p>
      </InfoNote>
      <InfoNote title="A login email never arrived?">
        <p>
          The email is only a convenience for handing someone their PIN — it never blocks their login, so a
          missing or bounced email doesn&apos;t stop them from signing in with their Login ID and PIN. Use{' '}
          <strong>Resend login email</strong> on their row to try again, or reveal/reset the PIN and hand it over
          directly.
        </p>
      </InfoNote>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); }}>
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
          title="Show only accounts missing an address"
        >
          Missing ID info
        </button>
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title={`Couldn't load ${listLabel}`} action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : members.length === 0 ? (
        <Card>
          <EmptyState
            icon={activeTab.icon}
            title={debounced || incompleteOnly ? 'No matches' : `No ${listLabel} yet`}
            description={debounced || incompleteOnly ? 'Try a different search or filter.' : 'Add your first account to get started.'}
            action={!debounced && !incompleteOnly ? <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add</Button> : undefined}
          />
        </Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    {tab === 'all' && <TableHead>Role</TableHead>}
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PIN</TableHead>
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
                      {tab === 'all' && (
                        <TableCell><Badge variant="neutral">{roleLabel(m.role)}</Badge></TableCell>
                      )}
                      <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email ?? '—'}</TableCell>
                      <TableCell><Badge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell><PinCell member={m} /></TableCell>
                      <TableCell className="text-right">
                        {confirmDeactivateId === m.id ? (
                          <span className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivateId(null)}>Cancel</Button>
                            <Button variant="danger" size="sm" loading={updating} onClick={() => toggleActive(m)}>Confirm</Button>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setOpen(true); }}>
                              <Pencil size={14} /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setResetTarget({ id: m.id, name: m.name })}>
                              <KeyRound size={14} /> Reset PIN
                            </Button>
                            {m.email && (
                              <Button variant="ghost" size="sm" onClick={() => setResendTarget({ id: m.id, name: m.name, email: m.email! })}>
                                <Send size={14} /> Resend
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => (m.isActive ? setConfirmDeactivateId(m.id) : toggleActive(m))}
                            >
                              {m.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <StaffCard
                key={m.id}
                member={m}
                showRole={tab === 'all'}
                confirmDeactivate={confirmDeactivateId === m.id}
                updating={updating}
                onEdit={() => { setEditing(m); setOpen(true); }}
                onResetPin={() => setResetTarget({ id: m.id, name: m.name })}
                onResend={m.email ? () => setResendTarget({ id: m.id, name: m.name, email: m.email! }) : undefined}
                onToggleActive={() => (m.isActive ? setConfirmDeactivateId(m.id) : toggleActive(m))}
                onCancelDeactivate={() => setConfirmDeactivateId(null)}
                onConfirmDeactivate={() => toggleActive(m)}
              />
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
        defaultRole={tab === 'all' ? 'teacher' : tab}
        editing={editing}
      />

      {resendTarget && (
        <ResendLoginEmailDialog
          userId={resendTarget.id}
          name={resendTarget.name}
          currentEmail={resendTarget.email}
          onClose={() => setResendTarget(null)}
        />
      )}

      {resetTarget && (
        <ResetPinDialog
          userId={resetTarget.id}
          name={resetTarget.name}
          onClose={() => setResetTarget(null)}
        />
      )}

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

/** Mobile equivalent of the desktop table row — a self-contained card,
 *  mirroring ClassRosterView.tsx's RosterCard pattern (avatar/name header,
 *  a status section, then a row of actions along the bottom). */
function StaffCard({
  member, showRole, confirmDeactivate, updating,
  onEdit, onResetPin, onResend, onToggleActive, onCancelDeactivate, onConfirmDeactivate,
}: {
  member: ManagedUser;
  showRole: boolean;
  confirmDeactivate: boolean;
  updating: boolean;
  onEdit: () => void;
  onResetPin: () => void;
  onResend?: () => void;
  onToggleActive: () => void;
  onCancelDeactivate: () => void;
  onConfirmDeactivate: () => void;
}) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        <Avatar
          size="md"
          photoUrl={member.profilePhoto}
          alt={member.name}
          initials={getInitials(member.firstName, member.lastName)}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{member.name}</p>
          <p className="text-xs text-muted-foreground">{member.phone}{member.email ? ` · ${member.email}` : ''}</p>
          {missingStaffInfo(member).length > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-warning">
              <AlertCircle size={11} className="shrink-0" /> Missing {missingStaffInfo(member).join(', ')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {showRole && <Badge variant="neutral">{roleLabel(member.role)}</Badge>}
          <Badge variant={member.isActive ? 'success' : 'neutral'}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">PIN</span>
        <PinCell member={member} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-border pt-3">
        {confirmDeactivate ? (
          <>
            <Button variant="ghost" size="sm" onClick={onCancelDeactivate}>Cancel</Button>
            <Button variant="danger" size="sm" loading={updating} onClick={onConfirmDeactivate}>Confirm</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}><Pencil size={14} /> Edit</Button>
            <Button variant="ghost" size="sm" onClick={onResetPin}><KeyRound size={14} /> Reset PIN</Button>
            {onResend && <Button variant="ghost" size="sm" onClick={onResend}><Send size={14} /> Resend</Button>}
            <Button variant="ghost" size="sm" onClick={onToggleActive}>
              {member.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

/** Resets (or sets a custom) PIN for a staff-type account — same
 *  random/custom choice and reveal-once flow as ClassRosterView.tsx's
 *  ResetPinDialog for students. */
function ResetPinDialog({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
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
    return <TempPasswordDialog open onClose={onClose} name={name} pin={result} />;
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
function ResendLoginEmailDialog({
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
