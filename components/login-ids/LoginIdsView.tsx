'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Eye, EyeOff, KeyRound, Loader2, Users2, AlertCircle,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { InfoNote } from '@/components/ui/info-note';
import { useDebounce } from '@/hooks/useDebounce';
import { getInitials, cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import { Avatar } from '@/components/ui/avatar';
import { ClassRosterView } from '@/components/students/ClassRosterView';
import {
  useGetUsersQuery,
  useLazyGetStaffPinQuery,
  useResetStaffPinMutation,
  type ManageableRole,
  type ManagedUser,
} from '@/store/api/usersApi';

type LoginTab = 'students' | 'staff';

/**
 * Dedicated "Login IDs & PINs" page — promoted from the dialog that used to
 * live on the Students page (see StudentsView.tsx's old rosterOpen modal).
 * Students tab reuses ClassRosterView wholesale (its class/section picker,
 * table/card layout, reveal/reset, and CSV export); the Staff tab is a
 * parallel but standalone credentials-only view over the same
 * teacher/staff/accountant accounts StaffManagementView manages — no
 * create/edit/deactivate here, that stays on the Staff page.
 */
export function LoginIdsView() {
  const [tab, setTab] = useState<LoginTab>(() =>
    typeof window === 'undefined' ? 'students' : (new URLSearchParams(window.location.search).get('tab') as LoginTab | null) ?? 'students'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login IDs & PINs"
        description="Look up or reset any student, guardian, teacher, staff or accountant's Login ID and PIN."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as LoginTab)}>
        <TabsList>
          <TabsTrigger value="students"><Users2 size={14} className="mr-1.5" /> Students</TabsTrigger>
          <TabsTrigger value="staff"><KeyRound size={14} className="mr-1.5" /> Staff</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'students' ? (
        <ClassRosterView mode="admin" embedded />
      ) : (
        <StaffLoginRoster />
      )}

      <div className="space-y-2">
        <InfoNote title="How do people log in?">
          <p>
            Everyone — students, guardians, teachers, staff and accountants — logs in with a Login ID (or, for
            guardians and staff, their phone/email) plus a PIN. Both are generated automatically the moment an
            account is created, shown once right then, and can always be looked up again right here.
          </p>
        </InfoNote>
        <InfoNote title="What if someone didn't get their PIN?">
          <p>
            A missing or bounced login email never blocks anyone from signing in — it&apos;s only a convenience for
            handing over the PIN in the first place. Reveal the current PIN here (if it&apos;s still school-issued)
            or reset it to a new one and hand it over directly. Delivery issues for guardians and staff also show up
            inline on the Students and Staff pages.
          </p>
        </InfoNote>
      </div>
    </div>
  );
}

const ROLE_FILTERS: { value: 'all' | ManageableRole; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff' },
  { value: 'accountant', label: 'Accountant' },
];

const PAGE_SIZE = 15;

/** Reveal-on-demand state for a staff-type account's own PIN — same pattern
 *  as ClassRosterView.tsx's useStudentPinReveal / StaffManagementView.tsx's
 *  useStaffPinReveal. Kept local here since this page's reveal state is
 *  independent of the Staff management page's own table. */
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

function StaffLoginRoster() {
  const [role, setRole] = useState<'all' | ManageableRole>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(query, 350);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; systemId: string | null } | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery({
    role: role === 'all' ? undefined : role,
    search: debounced || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const members = data?.data ?? [];
  const total = data?.meta?.total ?? members.length;
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by name or phone…"
          className="flex-1"
        />
        <Select value={role} onValueChange={(v) => { setRole(v as 'all' | ManageableRole); setPage(1); }}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {isError ? (
        <Card><EmptyState icon={AlertCircle} title="Couldn't load staff logins" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : members.length === 0 ? (
        <Card><EmptyState icon={Users2} title="No matches" description="Try a different search or role filter." /></Card>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Login ID</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <StaffLoginRow key={m.id} member={m} onResetPin={() => setResetTarget({ id: m.id, name: m.name, systemId: m.systemId })} />
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <StaffLoginCard key={m.id} member={m} onResetPin={() => setResetTarget({ id: m.id, name: m.name, systemId: m.systemId })} />
            ))}
          </div>

          {totalPages > 1 && (
            <Card className="mt-3 flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
                <span className="ml-1.5">· {total} account{total === 1 ? '' : 's'}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {resetTarget && (
        <ResetStaffPinDialog
          userId={resetTarget.id}
          name={resetTarget.name}
          systemId={resetTarget.systemId}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

function StaffLoginRow({ member, onResetPin }: { member: ManagedUser; onResetPin: () => void }) {
  const { revealed, onReveal } = useStaffPinReveal(member.id);
  const canReveal = member.pinState === 'school_issued';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="sm" photoUrl={member.profilePhoto} alt={member.name} initials={getInitials(member.firstName, member.lastName)} />
          <span className="font-medium text-foreground">{member.name}</span>
        </div>
      </TableCell>
      <TableCell><Badge variant="neutral" className="capitalize">{member.role}</Badge></TableCell>
      <TableCell dir="ltr" className="font-mono text-sm">{member.systemId ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">
        <p>{member.phone}</p>
        {member.email && <p className="text-xs">{member.email}</p>}
      </TableCell>
      <TableCell>
        {!canReveal ? (
          <Badge variant="neutral">Self-set (not viewable)</Badge>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onReveal}>
              {revealed === 'loading' ? <Loader2 size={14} className="animate-spin" /> : revealed ? <EyeOff size={14} /> : <Eye size={14} />}
              {revealed && revealed !== 'loading' ? 'Hide' : 'Reveal'}
            </Button>
            {revealed && revealed !== 'loading' && (
              <span dir="ltr" className="font-mono font-semibold tracking-wide">{revealed}</span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="secondary" onClick={onResetPin}><KeyRound size={14} /> Reset PIN</Button>
      </TableCell>
    </TableRow>
  );
}

function StaffLoginCard({ member, onResetPin }: { member: ManagedUser; onResetPin: () => void }) {
  const { revealed, onReveal } = useStaffPinReveal(member.id);
  const canReveal = member.pinState === 'school_issued';

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        <Avatar size="sm" photoUrl={member.profilePhoto} alt={member.name} initials={getInitials(member.firstName, member.lastName)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{member.name}</p>
          <p className="text-xs text-muted-foreground">
            {member.phone}
            {member.systemId && <span dir="ltr" className="ml-1 font-mono">· {member.systemId}</span>}
          </p>
        </div>
        <Badge variant="neutral" className="shrink-0 capitalize">{member.role}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">PIN</span>
        {!canReveal ? (
          <Badge variant="neutral">Self-set</Badge>
        ) : (
          <div className="flex items-center gap-2">
            {revealed && revealed !== 'loading' && (
              <span dir="ltr" className="font-mono font-semibold tracking-wide">{revealed}</span>
            )}
            <Button size="sm" variant="ghost" onClick={onReveal}>
              {revealed === 'loading' ? <Loader2 size={14} className="animate-spin" /> : revealed ? <EyeOff size={14} /> : <Eye size={14} />}
              {revealed && revealed !== 'loading' ? 'Hide' : 'Reveal'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
        <Button size="sm" variant="secondary" onClick={onResetPin}><KeyRound size={14} /> Reset PIN</Button>
      </div>
    </Card>
  );
}

/** Same random/custom choice and reveal-once flow as ClassRosterView.tsx's
 *  ResetPinDialog / StaffManagementView.tsx's ResetPinDialog. */
function ResetStaffPinDialog({ userId, name, systemId, onClose }: { userId: string; name: string; systemId?: string | null; onClose: () => void }) {
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
