'use client';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Printer, CreditCard as IdCardIcon, GraduationCap, Briefcase, Landmark, ShieldCheck, BookOpen, ImageOff, Search, X, UserCircle, Phone, MapPin, RotateCw, Pencil, RefreshCw, ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { QRCode } from '@/components/ui/qr-code';
import { useGetStaffIdCardsQuery, useReissueStaffCardsMutation, type StaffCardRole, type StaffIdCard, type StaffIdCardInstitution } from '@/store/api/usersApi';
import {
  CARD_WIDTH_MM, CARD_HEIGHT_MM, ID_CARD_PRINT_CSS, idCardNameSizeClass, formatCardDate, ID_CARD_ROLE_COLORS,
} from '@/components/shared/idCardPrint';
import { IdCardBack, type IdCardBackRow } from '@/components/shared/IdCardBack';
import { IdCardCredit } from '@/components/shared/IdCardCredit';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { EditCardDetailsDialog } from '@/components/students/EditCardDetailsDialog';
import { ReissueCardsConfirmDialog } from '@/components/students/ReissueCardsConfirmDialog';
import { getErrorMessage } from '@/lib/get-error-message';
import { IdCardMissingFieldsBanner, type IdCardMissingFieldItem } from '@/components/shared/IdCardMissingFieldsBanner';
import { idCardFieldLabel } from '@/lib/id-card-missing';
import { PrintAllCardsDialog } from '@/components/shared/PrintAllCardsDialog';

const ROLE_FILTERS: { value: StaffCardRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'admin', label: 'Admin' },
];

// A role-appropriate accent — distinct from student cards so staff cards are
// visually distinguishable from a student's at a glance. Header `band` is a
// solid dark role color per the locked design (see ID_CARD_ROLE_COLORS) —
// applied as an inline style at render time, not a Tailwind class, so it
// can't be silently overridden by a conflicting utility class.
const ROLE_STYLE: Record<StaffCardRole, { accent: string; bandColor: string; soft: string; icon: typeof Briefcase; label: string }> = {
  teacher: { accent: 'border-accent', bandColor: ID_CARD_ROLE_COLORS.teacher, soft: 'bg-accent/15 text-accent-foreground', icon: BookOpen, label: 'Teacher' },
  staff: { accent: 'border-success', bandColor: ID_CARD_ROLE_COLORS.staff, soft: 'bg-success-soft text-success', icon: Briefcase, label: 'Staff' },
  accountant: { accent: 'border-warning', bandColor: ID_CARD_ROLE_COLORS.accountant, soft: 'bg-warning-soft text-warning', icon: Landmark, label: 'Accountant' },
  admin: { accent: 'border-danger', bandColor: ID_CARD_ROLE_COLORS.admin, soft: 'bg-danger-soft text-danger', icon: ShieldCheck, label: 'Admin' },
};

export function StaffIdCardsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const roleParam = (searchParams.get('role') as StaffCardRole | null) ?? 'all';

  // We still fetch the role-scoped roster, but only to power the name
  // selector below — nothing renders as a card until one specific person is
  // picked. Fetching names/IDs for a dropdown is cheap even for a large
  // institution; it's rendering a QR card per person that got unmanageable,
  // so that's the part gated behind an explicit selection now.
  const { data, isFetching } = useGetStaffIdCardsQuery(roleParam === 'all' ? undefined : { role: roleParam });
  const sheet = data?.data;
  const roster = useMemo(() => sheet?.staff ?? [], [sheet]);

  // "Re-issue all staff" always affects every role regardless of the
  // current filter above — when a specific role is selected, `roster` is
  // scoped to just that role, so it can't be reused as the "all staff"
  // count. Fetches the unfiltered roster only when actually needed (i.e.
  // skipped entirely while roleParam is already 'all', where `roster` above
  // already IS that count) — same cached query the "All roles" filter
  // itself uses, so this doesn't add a real extra round trip once someone's
  // looked at "All roles" at all during this session.
  const { data: allStaffData, isFetching: allStaffFetching } = useGetStaffIdCardsQuery(undefined, { skip: roleParam === 'all' });
  const allStaffCount = roleParam === 'all' ? roster.length : allStaffData?.data?.staff.length ?? null;
  const allStaffCountFetching = roleParam === 'all' ? isFetching : allStaffFetching;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => roster.find((s) => s.id === selectedId) ?? null, [roster, selectedId]);

  const [reissueOpen, setReissueOpen] = useState(false);
  const [reissueAllOpen, setReissueAllOpen] = useState(false);
  const [printAllOpen, setPrintAllOpen] = useState(false);
  const [reissueCards, { isLoading: reissuing }] = useReissueStaffCardsMutation();
  const canReissue = roleParam !== 'all';
  const handleReissue = async () => {
    if (roleParam === 'all') return;
    try {
      const res = await reissueCards({ role: roleParam }).unwrap();
      toast.success(`Re-issued cards for ${res.data.updatedCount} ${roleParam}${res.data.updatedCount === 1 ? '' : 's'}`);
      setReissueOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not re-issue cards'));
    }
  };
  const handleReissueAll = async () => {
    try {
      const res = await reissueCards({ role: 'all' }).unwrap();
      toast.success(`Re-issued cards for ${res.data.updatedCount} staff member${res.data.updatedCount === 1 ? '' : 's'} across all roles`);
      setReissueAllOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not re-issue cards'));
    }
  };

  const setRole = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete('role');
    else params.set('role', value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // Changing the role narrows the name list — whatever was selected under
    // the old role may not even be in the new one, so clear it rather than
    // silently keep showing a card that no longer matches the chosen filter.
    setSelectedId(null);
  };

  // Live counts for the reissue actions below — same already-fetched roster
  // that powers the name picker, so no extra request is needed just to show
  // "this affects N people" before the admin commits to anything.
  const roleCountLabel = roleParam === 'all' ? 'staff' : roleParam;

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />

      {/* Toolbar — purely instrumental (find a person), kept visually
          lighter than the card it leads to so it doesn't compete with the
          actual ID card below it. */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Role (optional filter)</Label>
            <Select value={roleParam} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <StaffNamePicker
              options={roster}
              loading={isFetching}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      </div>

      {/* Bulk re-issue — its own separated, lower-emphasis section rather
          than buttons inline with the picker above; see IdCardsView.tsx's
          matching comment for the full reasoning. Both actions show their
          exact affected count up front. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 no-print">
        <p className="text-xs text-muted-foreground">
          {isFetching ? 'Loading roster…' : `${roster.length} active ${roleCountLabel} member${roster.length === 1 ? '' : 's'} found`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={roster.length === 0}
            onClick={() => setPrintAllOpen(true)}
          >
            <Printer size={14} /> Print all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canReissue || roster.length === 0}
            title={!canReissue ? 'Pick a specific role (not "All roles") to re-issue cards' : undefined}
            onClick={() => setReissueOpen(true)}
          >
            <RefreshCw size={14} /> Re-issue this role
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={allStaffCount === 0}
            onClick={() => setReissueAllOpen(true)}
          >
            <RefreshCw size={14} /> Re-issue all staff
          </Button>
        </div>
      </div>

      {sheet && (
        <PrintAllCardsDialog
          open={printAllOpen}
          onClose={() => setPrintAllOpen(false)}
          title={`Print all cards — ${roleCountLabel === 'staff' ? 'All roles' : ROLE_STYLE[roleParam as StaffCardRole]?.label ?? roleCountLabel}`}
          subtitle={`${roster.length} active member${roster.length === 1 ? '' : 's'}, front side only`}
          items={roster}
          keyOf={(s) => s.id}
          renderCard={(s) => <StaffIdCardItem member={s} institution={sheet.institution} />}
          downloadFileName={`${roleParam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-id-cards.pdf`}
        />
      )}

      <ReissueCardsConfirmDialog
        open={reissueOpen}
        onClose={() => setReissueOpen(false)}
        onConfirm={handleReissue}
        loading={reissuing}
        title="Re-issue cards for this role?"
        description={`This resets the issue and expiry dates on ${roster.length} active ${roleParam === 'all' ? 'staff' : roleParam} member${roster.length === 1 ? "'s" : "s'"} card to a fresh validity window. It cannot be undone.`}
        confirmLabel="Re-issue cards"
      />

      <ReissueCardsConfirmDialog
        open={reissueAllOpen}
        onClose={() => setReissueAllOpen(false)}
        onConfirm={handleReissueAll}
        loading={reissuing}
        title="Re-issue cards for all staff?"
        description={`This resets the issue and expiry dates on ${allStaffCountFetching || allStaffCount === null ? "every active staff member's" : allStaffCount === 1 ? "1 active staff member's" : `${allStaffCount} active staff members'`} card — teachers, staff, accountants, and admins — to a fresh validity window, in one go. It cannot be undone.`}
        confirmLabel="Re-issue cards for all staff"
      />

      {!selectedId ? (
        isFetching ? (
          <Card className="p-4 no-print"><Skeleton className="h-64 w-full" /></Card>
        ) : roster.length === 0 ? (
          <Card className="no-print">
            <EmptyState
              icon={IdCardIcon}
              title="No active staff match this filter"
              description="Try a different role, or check the Staff page for who's active."
            />
          </Card>
        ) : (
          <StaffRosterList roster={roster} settings={sheet?.institution.settings?.idCard} onSelect={setSelectedId} />
        )
      ) : !selected ? (
        <Card className="p-5 no-print"><Skeleton className="h-64 w-full" /></Card>
      ) : (
        <StaffIdCardPreview member={selected} institution={sheet!.institution} printSuppressed={printAllOpen} />
      )}
    </div>
  );
}

/**
 * Lightweight, scannable roster list — same pattern as IdCardsView.tsx's
 * StudentRosterList (see that component's comment for the full reasoning).
 * Role badge stands in for the "which kind of card" signal the student
 * version doesn't need, since a staff roster can mix roles.
 */
function StaffRosterList({
  roster, settings, onSelect,
}: {
  roster: StaffIdCard[];
  settings?: { showNationalId: boolean } | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm no-print">
      <div className="divide-y divide-border">
        {roster.map((s) => {
          const style = ROLE_STYLE[s.role] ?? ROLE_STYLE.staff;
          const missing = !s.address || ((settings?.showNationalId ?? true) && !s.nationalIdNumber);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="relative shrink-0">
                <Avatar
                  size="sm"
                  photoUrl={s.profilePhoto}
                  alt={s.name}
                  initials={s.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                />
                {missing && (
                  <span
                    title="Missing card info"
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-warning"
                  />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                <span className={cn('mt-0.5 inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', style.soft)}>
                  {style.label}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StaffIdCardPreview({
  member, institution, printSuppressed,
}: {
  member: StaffIdCard;
  institution: StaffIdCardInstitution;
  // See IdCardsView.tsx's StudentIdCardPreview — same fix for the same
  // reason: without this, printing "all cards" while a staff member is
  // also selected printed the bulk grid and this single card/back on top
  // of each other, since both #id-card-print and #id-card-print-sheet
  // stay in the DOM and both get revealed at print time.
  printSuppressed?: boolean;
}) {
  const [showBack, setShowBack] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const nationalIdLabel = 'CNIC';
  const settings = institution.settings?.idCard;

  const handleDownload = async () => {
    if (!frontRef.current) return;
    setDownloading(true);
    try {
      const { downloadCardPdf, cardFileName } = await import('@/components/shared/cardDownload');
      await downloadCardPdf({
        frontEl: frontRef.current,
        backEl: backRef.current,
        fileName: cardFileName(member.name, 'staff-id-card'),
      });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not generate the PDF'));
    } finally {
      setDownloading(false);
    }
  };

  // Every item here fixes through the same "Edit card details" dialog now
  // — no more routing address to the full staff profile page, since the
  // dialog covers address (and photo) directly and PATCHes the same
  // record either way (see EditCardDetailsDialog.tsx).
  const missingItems: IdCardMissingFieldItem[] = [];
  if (!member.address) {
    missingItems.push({ key: 'address', label: idCardFieldLabel('address'), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }
  if ((settings?.showNationalId ?? true) && !member.nationalIdNumber) {
    missingItems.push({ key: 'nationalId', label: idCardFieldLabel('nationalId', nationalIdLabel), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }
  if (!member.profilePhoto) {
    missingItems.push({ key: 'photo', label: idCardFieldLabel('photo'), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }

  return (
    <>
      <div className="no-print flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil size={14} /> Edit card details
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowBack((v) => !v)}>
          <RotateCw size={15} /> {showBack ? 'Show front' : 'Flip to back'}
        </Button>
        <Button size="sm" variant="outline" loading={downloading} onClick={handleDownload}>
          <Download size={15} /> Download card
        </Button>
        <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print card</Button>
      </div>
      <IdCardMissingFieldsBanner items={missingItems} />
      {/* Same "this card IS the point of the page" treatment as
          IdCardsView.tsx's student preview — see that file's comment. */}
      <div id={printSuppressed ? undefined : 'id-card-print'} className="flex justify-center rounded-2xl bg-muted/30 p-6 sm:p-10">
        <div className="w-full max-w-md space-y-4">
          <div ref={frontRef} className={cn(showBack ? 'hidden print:block' : 'block')}>
            <StaffIdCardItem member={member} institution={institution} />
          </div>
          <div ref={backRef} className={cn(showBack ? 'block' : 'hidden print:block')}>
            <IdCardBack
              institution={institution}
              qrValue={member.qr}
              validityLabel={formatCardDate(member.cardExpiryDate)}
              rows={staffBackRows(member)}
            />
          </div>
        </div>
      </div>
      {editOpen && (
        <EditCardDetailsDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          target={{
            id: member.id,
            name: member.name,
            kind: 'staff',
            nationalIdLabel,
            nationalIdNumber: member.nationalIdNumber ?? null,
            cardIssueDate: member.cardIssueDate ?? null,
            cardExpiryDate: member.cardExpiryDate ?? null,
            address: member.address,
            userId: member.id,
            profilePhoto: member.profilePhoto,
          }}
        />
      )}
    </>
  );
}

export function staffBackRows(member: StaffIdCard): IdCardBackRow[] {
  const rows: IdCardBackRow[] = [];
  if (member.phone) rows.push({ icon: Phone, label: 'Phone', value: member.phone });
  if (member.address) rows.push({ icon: MapPin, label: 'Address', value: member.address });
  return rows;
}

/**
 * A name-first selector: type to search the (role-scoped) roster, pick one
 * result. Deliberately not a filter-a-grid search box — selecting a result
 * closes the list and is the only way a card ever renders, matching the
 * "select a specific name from options" requirement rather than showing
 * everyone that matches as you type.
 */
function StaffNamePicker({
  options, loading, selectedId, onSelect,
}: {
  options: StaffIdCard[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((s) => s.id === selectedId) ?? null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 20);
  }, [options, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (selected) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-input bg-card pl-3 pr-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <UserCircle size={16} className="shrink-0 text-primary" />
          <span className="truncate font-medium text-foreground">{selected.name}</span>
        </span>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery(''); }}
          aria-label="Clear selected person"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading roster…' : 'Type a name…'}
          disabled={loading}
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">No matching names.</p>
          ) : (
            results.map((s) => {
              const style = ROLE_STYLE[s.role] ?? ROLE_STYLE.staff;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSelect(s.id); setQuery(''); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <Avatar
                    photoUrl={s.profilePhoto}
                    alt={s.name}
                    initials={s.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{s.name}</span>
                    <span className={cn('mt-0.5 inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', style.soft)}>
                      {style.label}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export const StaffIdCardItem = memo(function StaffIdCardItem({
  member, institution,
}: {
  member: StaffIdCard;
  institution: StaffIdCardInstitution;
}) {
  const [first = '', last = ''] = member.name.split(' ');
  const style = ROLE_STYLE[member.role] ?? ROLE_STYLE.staff;
  const RoleIcon = style.icon;
  const roleSubtitle = member.role === 'teacher' ? 'Teacher identity card' : 'Staff identity card';
  const issued = formatCardDate(member.cardIssueDate);
  const expiry = formatCardDate(member.cardExpiryDate);
  const settings = institution.settings?.idCard;
  const showNationalId = settings?.showNationalId ?? true;
  const showInstituteName = settings?.showInstituteName ?? true;
  const logoUrl = settings?.customLogoUrl ?? institution.logoUrl;

  return (
    <div
      className={cn(
        'id-card mx-auto flex w-full flex-col overflow-hidden rounded-xl border-2 bg-card shadow-sm',
        style.accent
      )}
      style={{ aspectRatio: `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`, maxWidth: 380 }}
    >
      {/* Header band — solid dark role color (see idCardPrint.ts's
          ID_CARD_ROLE_COLORS), applied as inline backgroundColor so it
          can't be silently overridden by a conflicting Tailwind class. Text
          on this band is always plain text-white/text-white/85. */}
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: style.bandColor }}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          {logoUrl ? (
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <Image src={logoUrl} alt="" fill sizes="28px" className="object-contain" unoptimized />
            </div>
          ) : (
            <GraduationCap size={15} style={{ color: style.bandColor }} />
          )}
        </div>
        <div className="min-w-0">
          {showInstituteName && (
            <p className={cn('line-clamp-2 break-words font-bold leading-[1.15] text-white', idCardNameSizeClass(institution.name))}>
              {institution.name}
            </p>
          )}
          <p className="mt-0.5 text-[8.5px] font-medium uppercase leading-tight tracking-wide text-white/85">
            {roleSubtitle}
          </p>
        </div>
      </div>

      {/* Body — identity essentials only; phone/address moved to the back
          (see IdCardBack) so this face isn't cramming six blocks of tiny
          text into a 54mm-tall card. */}
      <div className="flex flex-1 gap-3 p-3">
        <div className="flex flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2.5">
            {member.profilePhoto ? (
              <div className={cn('relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2', style.accent)}>
                <Image src={member.profilePhoto} alt="" fill sizes="48px" className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="relative shrink-0">
                <Avatar initials={`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()} size="lg" />
                <span
                  title="No photo on file"
                  className="no-print absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-card bg-warning text-warning-foreground"
                >
                  <ImageOff size={8} />
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold leading-tight text-foreground">{member.name}</p>
              <span className={cn('mt-0.5 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide', style.soft)}>
                <RoleIcon size={9} /> {style.label}
              </span>
            </div>
          </div>

          <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9.5px] leading-tight">
            <Field label="Staff ID" value={member.systemId} />
            {member.phone && <Field label="Mobile" value={member.phone} />}
            {showNationalId && member.nationalIdNumber && (
              <Field label="CNIC No." value={member.nationalIdNumber} className="col-span-2" />
            )}
          </dl>

          {(issued || expiry) && (
            <p className="text-[7.5px] leading-tight text-muted-foreground">
              {issued ? `Issued ${issued}` : ''}{issued && expiry ? ' | ' : ''}{expiry ? `Valid until ${expiry}` : ''}
            </p>
          )}

          <div className="pt-1">
            <IdCardCredit />
          </div>
        </div>

        {/* QR side panel — same sizing/mechanics as student cards */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border pl-3">
          <QRCode value={member.qr} size={80} />
          <p className="text-center text-[6.5px] leading-tight text-muted-foreground">Scan to verify</p>
        </div>
      </div>
    </div>
  );
});

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold text-foreground">{value}</dd>
    </div>
  );
}
