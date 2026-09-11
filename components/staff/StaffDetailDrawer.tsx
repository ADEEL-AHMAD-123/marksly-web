'use client';

import { useState } from 'react';
import {
  X, Pencil, UserMinus, UserCheck, AlertCircle, KeyRound, Eye, EyeOff, Send, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { useUpdateUserMutation, type ManagedUser } from '@/store/api/usersApi';
import { Avatar } from '@/components/ui/avatar';
import { getInitials, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';
import {
  roleLabel,
  useStaffPinReveal,
  StaffEmailBadge,
  ResendLoginEmailDialog,
} from './StaffManagementView';
import { useResetStaffPinMutation } from '@/store/api/usersApi';

interface Props {
  member: ManagedUser | null;
  open: boolean;
  onClose: () => void;
  onEdit: (m: ManagedUser) => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

/** Detail drawer for a staff-type account (teacher/staff/accountant),
 *  mirroring StudentDetailDrawer.tsx's structure — header with avatar/name/
 *  badges, an info block, a Login section (reveal/reset PIN), an Email
 *  delivery section (resend), and an Activate/Deactivate footer with the
 *  same inline confirm-box pattern. Since there's no dedicated GET /users/:id
 *  endpoint, the already-fetched row (ManagedUser) is passed in as a prop
 *  rather than re-fetched. */
export function StaffDetailDrawer({ member, open, onClose, onEdit }: Props) {
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [confirming, setConfirming] = useState(false);

  const { revealed, onReveal } = useStaffPinReveal(member?.id ?? '');
  const [resetPin, { isLoading: resettingPin }] = useResetStaffPinMutation();
  const [pendingResetPin, setPendingResetPin] = useState(false);
  const [resetResultPin, setResetResultPin] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);

  const m = member;

  const runResetPin = async () => {
    if (!m) return;
    try {
      const res = await resetPin({ id: m.id }).unwrap();
      setResetResultPin(res.data.pin);
      setPendingResetPin(false);
      toast.success('PIN reset');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not reset PIN'));
    }
  };

  const toggleActive = async () => {
    if (!m) return;
    try {
      const res = await updateUser({ id: m.id, body: { isActive: !m.isActive } }).unwrap();
      setConfirming(false);
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
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, `Could not update ${roleLabel(m.role).toLowerCase()}`));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setConfirming(false); onClose(); } }}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Account details</h2>
            <div className="flex items-center gap-1.5">
              {m && (
                <Button size="sm" onClick={() => onEdit(m)}>
                  <Pencil size={16} /> Edit
                </Button>
              )}
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={18} />
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!m ? null : (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    size="lg"
                    className="h-14 w-14 text-base"
                    photoUrl={m.profilePhoto}
                    alt={m.name}
                    initials={getInitials(m.firstName, m.lastName)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{roleLabel(m.role)}</p>
                  </div>
                  <Badge variant={m.isActive ? 'success' : 'neutral'} className="ml-auto">
                    {m.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-5 divide-y divide-border rounded-xl border border-border px-4">
                  <Row label="Role" value={roleLabel(m.role)} />
                  <Row label="Phone" value={m.phone} />
                  <Row label="Email" value={m.email} />
                  <Row label="Address" value={m.address} />
                  <Row label="CNIC" value={m.nationalIdNumber} />
                  {m.cardIssueDate && <Row label="Card issued" value={formatDate(m.cardIssueDate)} />}
                  {m.cardExpiryDate && <Row label="Card expires" value={formatDate(m.cardExpiryDate)} />}
                  <Row label="Last login" value={m.lastLoginAt ? formatDate(m.lastLoginAt) : 'Never'} />
                  <Row label="Created" value={formatDate(m.createdAt)} />
                </div>

                {!m.address && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
                    <AlertCircle size={13} className="shrink-0" /> Missing address — needed for the printable ID card.
                  </div>
                )}

                {/* Login — same reveal/reset pattern as StudentDetailDrawer's
                    Student login section, reusing useStaffPinReveal. */}
                <div className="mt-5">
                  <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <KeyRound size={12} /> Login
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">This account signs in using its Login ID and PIN.</p>
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="font-mono text-sm text-foreground">{m.systemId ?? 'Not generated yet'}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {m.pinState === 'staff_set' ? (
                          <span className="text-xs text-muted-foreground" title="This account holder changed their own PIN — only viewable by resetting it.">
                            Self-set PIN (not viewable)
                          </span>
                        ) : revealed && revealed !== 'loading' ? (
                          <span dir="ltr" className="font-mono text-sm font-medium text-foreground">{revealed}</span>
                        ) : (
                          <span className="font-mono text-sm text-muted-foreground">••••</span>
                        )}
                        {m.pinState !== 'staff_set' && (
                          <button
                            type="button"
                            disabled={revealed === 'loading'}
                            onClick={onReveal}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label={revealed ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {revealed && revealed !== 'loading' ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setPendingResetPin(true)}>
                      <KeyRound size={14} /> Reset
                    </Button>
                  </div>
                </div>

                {/* Email delivery — status of the most recent login email,
                    plus a resend action, mirroring the row's old
                    StaffEmailBadge but with the full picture in one place. */}
                <div className="mt-5">
                  <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Mail size={12} /> Email delivery
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Email is only a convenience for handing over the PIN — it never blocks sign-in.
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{m.email ?? 'No email on file'}</p>
                      <StaffEmailBadge status={m.emailStatus} />
                      {(!m.emailStatus || m.emailStatus === 'ok') && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-success">
                          <Mail size={11} className="shrink-0" /> Email OK
                        </p>
                      )}
                    </div>
                    {m.email && (
                      <Button variant="secondary" size="sm" onClick={() => setResendOpen(true)}>
                        <Send size={13} /> Resend
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {m && (
            <div className="border-t border-border px-5 py-4">
              {confirming ? (
                <div className="space-y-2.5 rounded-lg bg-danger-soft px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-danger" />
                    <span className="text-sm font-medium text-danger">Deactivate this account?</span>
                  </div>
                  <p className="text-xs text-danger/90">
                    <strong>{m.name}</strong> will no longer be able to sign in
                    {m.role === 'teacher' ? ', and will be unassigned from any subjects/sections they teach.' : '.'}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
                    <Button variant="danger" size="sm" loading={updating} onClick={toggleActive}>
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  {m.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => setConfirming(true)}
                    >
                      <UserMinus size={16} /> Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-success hover:bg-success-soft"
                      loading={updating}
                      onClick={toggleActive}
                    >
                      <UserCheck size={16} /> Activate
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>

      <ConfirmDialog
        open={pendingResetPin}
        onClose={() => setPendingResetPin(false)}
        onConfirm={runResetPin}
        loading={resettingPin}
        tone={m?.pinState === 'staff_set' ? 'warning' : 'default'}
        title="Reset this account's PIN?"
        description={
          m?.pinState === 'staff_set' ? (
            <>
              <strong>{m?.name}</strong> already changed their own PIN, so the current one can&apos;t be shown —
              resetting replaces it with a new one immediately, and you&apos;ll need to hand it to them yourself.
              You can view it again anytime from the Login section above.
            </>
          ) : (
            <>
              This replaces <strong>{m?.name}</strong>&apos;s current PIN with a new one immediately. You can view
              it anytime afterward from the Login section above.
            </>
          )
        }
        confirmLabel="Reset PIN"
      />

      {resetResultPin && m && (
        <TempPasswordDialog
          open
          onClose={() => setResetResultPin(null)}
          name={m.name}
          systemId={m.systemId ?? undefined}
          pin={resetResultPin}
          roleLabel={roleLabel(m.role)}
        />
      )}

      {resendOpen && m?.email && (
        <ResendLoginEmailDialog
          userId={m.id}
          name={m.name}
          currentEmail={m.email}
          onClose={() => setResendOpen(false)}
        />
      )}
    </Sheet>
  );
}
