'use client';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Printer, CreditCard as IdCardIcon, Droplet, GraduationCap, ImageOff, Search, X, UserCircle, MapPin, Users, RotateCw, Pencil, RefreshCw, ChevronRight } from 'lucide-react';
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
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetIdCardsQuery, useReissueStudentCardsMutation, type IdCard, type IdCardInstitution } from '@/store/api/studentsApi';
import { useTerminology, getTerminologyForTermType, nationalIdLabelForInstitutionType } from '@/lib/terminology';
import {
  CARD_WIDTH_MM, CARD_HEIGHT_MM, ID_CARD_PRINT_CSS, idCardNameSizeClass, formatCardDate, ID_CARD_ROLE_COLORS,
} from '@/components/shared/idCardPrint';
import { IdCardBack, type IdCardBackRow } from '@/components/shared/IdCardBack';
import { cn } from '@/lib/utils';
import { IdCardCredit } from '@/components/shared/IdCardCredit';
import { EditCardDetailsDialog } from '@/components/students/EditCardDetailsDialog';
import { ReissueCardsConfirmDialog } from '@/components/students/ReissueCardsConfirmDialog';
import { getErrorMessage } from '@/lib/get-error-message';
import { IdCardMissingFieldsBanner, type IdCardMissingFieldItem } from '@/components/shared/IdCardMissingFieldsBanner';
import { idCardFieldLabel } from '@/lib/id-card-missing';
import { PrintAllCardsDialog } from '@/components/shared/PrintAllCardsDialog';

export function IdCardsView() {
  const terminology = useTerminology();
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];
  // Prefer the selected class's own term-type wording (e.g. "Batch" for a
  // short-session course) once one is actually picked.
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? 'Section';
  const ready = !!classId && !!sectionId;
  // We still fetch the whole section's roster, but only to power the name
  // selector below — nothing renders as a card until one specific student is
  // picked. Fetching names for a dropdown is cheap even for a large section;
  // it's rendering a QR card per student that got unmanageable, so that part
  // stays gated behind an explicit selection.
  const { data, isFetching } = useGetIdCardsQuery({ classId, sectionId }, { skip: !ready });
  const sheet = data?.data;
  const roster = sheet?.students ?? [];
  const selected = useMemo(() => roster.find((s) => s.id === selectedId) ?? null, [roster, selectedId]);

  const [reissueOpen, setReissueOpen] = useState(false);
  const [printAllOpen, setPrintAllOpen] = useState(false);
  const [reissueCards, { isLoading: reissuing }] = useReissueStudentCardsMutation();
  const handleReissue = async () => {
    try {
      const res = await reissueCards({ classId, sectionId }).unwrap();
      toast.success(`Re-issued cards for ${res.data.updatedCount} student${res.data.updatedCount === 1 ? '' : 's'}`);
      setReissueOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not re-issue cards'));
    }
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />

      {/* Toolbar — purely instrumental (find a person), kept visually
          lighter than the card it leads to (no shadow, thinner border) so
          it doesn't compete with the actual ID card below it. */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 no-print">
        {/* Class + Section stay side-by-side even on a phone (they're
            short selects, not text-entry fields) so only the wider Name
            search below needs its own full-width row — reaches the actual
            point of this toolbar (typing a name) with one less scroll/tap
            than three stacked full-width rows. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <Label>{terminology.classUnit}</Label>
            <Select
              value={classId}
              onValueChange={(v) => { setClassId(v); setSectionId(''); setSelectedId(null); }}
            >
              <SelectTrigger><SelectValue placeholder={`Select ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{sectionLabel}</Label>
            <Select
              value={sectionId}
              onValueChange={(v) => { setSectionId(v); setSelectedId(null); }}
              disabled={!classId}
            >
              <SelectTrigger><SelectValue placeholder={sectionLabel} /></SelectTrigger>
              <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>Student name</Label>
            <StudentNamePicker
              options={roster}
              loading={ready && isFetching}
              disabled={!ready}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      </div>

      {/* Bulk re-issue — deliberately its own separated, lower-emphasis
          section rather than a button inline with the picker above. This is
          a rare, dataset-wide, irreversible-feeling action; it shouldn't sit
          at the same visual weight as routine search controls (Fitts's Law
          cuts both ways — an accidental-tap-prone action next to frequently
          used ones is a mis-click waiting to happen). Shows the exact,
          already-fetched roster count up front so the admin can sanity-check
          the number BEFORE even opening the confirm dialog. */}
      {ready && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 no-print">
          <p className="text-xs text-muted-foreground">
            {isFetching
              ? 'Loading roster…'
              : `${roster.length} active student${roster.length === 1 ? '' : 's'} in this ${sectionLabel.toLowerCase()}`}
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
              disabled={roster.length === 0}
              onClick={() => setReissueOpen(true)}
            >
              <RefreshCw size={14} /> Re-issue cards for this {sectionLabel.toLowerCase()}
            </Button>
          </div>
        </div>
      )}

      {sheet && (
        <PrintAllCardsDialog
          open={printAllOpen}
          onClose={() => setPrintAllOpen(false)}
          title={`Print all cards — ${sheet.className ?? ''}${sheet.section ? ` — ${sheet.section}` : ''}`}
          subtitle={`${roster.length} active student${roster.length === 1 ? '' : 's'}, front side only`}
          items={roster}
          keyOf={(s) => s.id}
          renderCard={(s) => (
            <IdCardItem student={s} institution={sheet.institution} className={sheet.className} section={sheet.section} termName={sheet.termName} />
          )}
        />
      )}

      <ReissueCardsConfirmDialog
        open={reissueOpen}
        onClose={() => setReissueOpen(false)}
        onConfirm={handleReissue}
        loading={reissuing}
        title={`Re-issue cards for this ${sectionLabel.toLowerCase()}?`}
        description={`This resets the issue and expiry dates on ${roster.length} active student${roster.length === 1 ? '' : 's'} in this ${sectionLabel.toLowerCase()} to a fresh validity window. It cannot be undone.`}
        confirmLabel="Re-issue cards"
      />

      {!ready ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title={`Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()}`} description="Then pick a specific student to view their ID card." /></Card>
      ) : !selectedId ? (
        isFetching ? (
          <Card className="p-4 no-print"><Skeleton className="h-64 w-full" /></Card>
        ) : roster.length === 0 ? (
          <Card className="no-print">
            <EmptyState
              icon={IdCardIcon}
              title="No active students in this section"
              description="Once students are enrolled here, they'll show up below to pick from."
            />
          </Card>
        ) : (
          <StudentRosterList roster={roster} settings={sheet?.institution.settings?.idCard} onSelect={setSelectedId} />
        )
      ) : !selected ? (
        <Card className="p-5 no-print"><Skeleton className="h-64 w-full" /></Card>
      ) : (
        <StudentIdCardPreview
          student={selected}
          institution={sheet!.institution}
          className={sheet!.className}
          section={sheet!.section}
          termName={sheet!.termName}
        />
      )}
    </div>
  );
}

/**
 * Lightweight, scannable roster list — avatars, names, roll numbers, and a
 * small warning dot for anyone missing a field their card is configured to
 * show. Deliberately NOT a full data table (sort/pagination/bulk-select):
 * this is just "browse and pick one," the type-ahead search above stays the
 * fast path for a known name in a large section. No QR/card is rendered per
 * row — this list only ever holds names/avatars/booleans, which is exactly
 * the "cheap to fetch, expensive to render as a full card" split the
 * roster-fetch-for-the-picker comment above already relies on.
 */
function StudentRosterList({
  roster, settings, onSelect,
}: {
  roster: IdCard[];
  settings?: { showNationalId: boolean; showBloodGroup: boolean } | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm no-print">
      <div className="divide-y divide-border">
        {roster.map((s) => {
          const missing =
            ((settings?.showBloodGroup ?? true) && !s.bloodGroup) ||
            (!s.address && !s.city) ||
            !s.parentName ||
            ((settings?.showNationalId ?? true) && !s.nationalIdNumber);
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
                <span className="block truncate text-xs text-muted-foreground">Roll #{s.rollNumber}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StudentIdCardPreview({
  student, institution, className, section, termName,
}: {
  student: IdCard;
  institution: IdCardInstitution;
  className: string | null;
  section: string | null;
  termName: string | null;
}) {
  const [showBack, setShowBack] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { term: termLabel } = useTerminology();
  const nationalIdLabel = nationalIdLabelForInstitutionType(institution.type);
  const settings = institution.settings?.idCard;

  // What's missing FOR WHAT'S CURRENTLY CONFIGURED TO SHOW on this card —
  // photo is deliberately excluded here since the card face already shows
  // its own small warning badge for that (see IdCardItem below).
  // Every item here fixes through the same "Edit card details" dialog now
  // (see EditCardDetailsDialog.tsx) — it was expanded to cover address,
  // parent/guardian info and photo alongside national ID/dates/blood
  // group, so there's no longer a separate "go edit the full profile"
  // detour: one dialog, one PATCH, the same record either way.
  const missingItems: IdCardMissingFieldItem[] = [];
  if ((settings?.showBloodGroup ?? true) && !student.bloodGroup) {
    missingItems.push({ key: 'bloodGroup', label: idCardFieldLabel('bloodGroup'), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }
  if (!student.address && !student.city) {
    missingItems.push({ key: 'address', label: idCardFieldLabel('address'), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }
  if (!student.parentName) {
    missingItems.push({ key: 'parentInfo', label: idCardFieldLabel('parentInfo'), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }
  if ((settings?.showNationalId ?? true) && !student.nationalIdNumber) {
    missingItems.push({ key: 'nationalId', label: idCardFieldLabel('nationalId', nationalIdLabel), action: { type: 'cardDetails', onClick: () => setEditOpen(true) } });
  }
  if (!student.profilePhoto) {
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
        <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print card</Button>
      </div>
      <IdCardMissingFieldsBanner items={missingItems} />
      {/* This card IS the point of the page — given its own contrasting
          backdrop and generous padding so it unmistakably reads as "the
          product," not just another panel the same weight as the picker
          toolbar above it. Backdrop/padding are no-print so the printed
          output stays exactly the card, nothing extra. */}
      <div id="id-card-print" className="flex justify-center rounded-2xl bg-muted/30 p-6 sm:p-10">
        <div className="w-full max-w-md space-y-4">
          {/* On screen, only the flipped-to face shows; on print, both
              always render regardless of which one was showing. */}
          <div className={cn(showBack ? 'hidden print:block' : 'block')}>
            <IdCardItem student={student} institution={institution} className={className} section={section} termName={termName} />
          </div>
          <div className={cn(showBack ? 'block' : 'hidden print:block')}>
            <IdCardBack
              institution={institution}
              qrValue={student.qr}
              validityLabel={termName ?? termLabel}
              rows={studentBackRows(student, settings?.showBloodGroup ?? true)}
            />
          </div>
        </div>
      </div>
      {editOpen && (
        <EditCardDetailsDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          target={{
            id: student.id,
            name: student.name,
            kind: 'student',
            nationalIdLabel,
            nationalIdNumber: student.nationalIdNumber ?? null,
            cardIssueDate: student.cardIssueDate ?? null,
            cardExpiryDate: student.cardExpiryDate ?? null,
            bloodGroup: student.bloodGroup,
            address: student.address,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            userId: student.userId,
            profilePhoto: student.profilePhoto,
          }}
        />
      )}
    </>
  );
}

export function studentBackRows(student: IdCard, showBloodGroup = true): IdCardBackRow[] {
  const rows: IdCardBackRow[] = [];
  if (showBloodGroup && student.bloodGroup) rows.push({ icon: Droplet, label: 'Blood Group', value: student.bloodGroup });
  // Students never have their own phone — `student.phone` is always null now
  // (see IdCard type). Parent/guardian contact is shown separately below.
  if (student.address || student.city) {
    rows.push({ icon: MapPin, label: 'Address', value: [student.address, student.city].filter(Boolean).join(', ') });
  }
  if (student.parentName) {
    rows.push({ icon: Users, label: 'Parent / Guardian', value: `${student.parentName}${student.parentPhone ? ` · ${student.parentPhone}` : ''}` });
  }
  return rows;
}

/**
 * A name-first selector: type to search the section's roster, pick one
 * result. Deliberately not a filter-a-grid search box — selecting a result
 * closes the list and is the only way a card ever renders, mirroring the
 * same pattern used for staff ID cards.
 */
function StudentNamePicker({
  options, loading, disabled, selectedId, onSelect,
}: {
  options: IdCard[];
  loading: boolean;
  disabled: boolean;
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
          aria-label="Clear selected student"
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
          placeholder={disabled ? 'Select class & section first' : loading ? 'Loading roster…' : 'Type a name…'}
          disabled={disabled || loading}
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
      </div>
      {open && !disabled && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">No matching names.</p>
          ) : (
            results.map((s) => (
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
                  <span className="block truncate text-xs text-muted-foreground">Roll #{s.rollNumber}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const IdCardItem = memo(function IdCardItem({
  student, institution, className, section, termName,
}: {
  student: IdCard;
  institution: IdCardInstitution;
  className: string | null;
  section: string | null;
  termName: string | null;
}) {
  const [first = '', last = ''] = student.name.split(' ');
  const { term: termLabel } = useTerminology();
  const nationalIdLabel = nationalIdLabelForInstitutionType(institution.type);
  const issued = formatCardDate(student.cardIssueDate);
  const expiry = formatCardDate(student.cardExpiryDate);
  const settings = institution.settings?.idCard;
  const showNationalId = settings?.showNationalId ?? true;
  const showBloodGroup = settings?.showBloodGroup ?? true;
  const showInstituteName = settings?.showInstituteName ?? true;
  const logoUrl = settings?.customLogoUrl ?? institution.logoUrl;

  return (
    <div
      className="id-card mx-auto flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ aspectRatio: `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`, maxWidth: 380 }}
    >
      {/* Header band — solid dark navy per the locked ID-card design (not a
          lighter/muted tint — see idCardPrint.ts's ID_CARD_ROLE_COLORS for
          why this is an inline backgroundColor, not a Tailwind bg-* class).
          Text on this band is always plain text-white/text-white/85, never
          a semantic token that could resolve light-on-light or otherwise
          get silently overridden by a conflicting utility class. */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ backgroundColor: ID_CARD_ROLE_COLORS.student }}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          {logoUrl ? (
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <Image src={logoUrl} alt="" fill sizes="28px" className="object-contain" unoptimized />
            </div>
          ) : (
            <GraduationCap size={15} style={{ color: ID_CARD_ROLE_COLORS.student }} />
          )}
        </div>
        <div className="min-w-0">
          {showInstituteName && (
            <p className={cn('line-clamp-2 break-words font-bold leading-[1.15] text-white', idCardNameSizeClass(institution.name))}>
              {institution.name}
            </p>
          )}
          <p className="mt-0.5 text-[8.5px] font-medium uppercase leading-tight tracking-wide text-white/85">
            Student identity card{termName ? ` · ${termName}` : ` · ${termLabel}`}
          </p>
        </div>
      </div>

      {/* Body — deliberately just identity essentials: photo, name, class,
          the three ID numbers, and a QR. Contact info, blood group, and
          guardian details moved to the back (see IdCardBack below) so this
          face has real breathing room instead of six stacked blocks of
          6.5-8px text, which is what made the old single-sided card read
          as cramped rather than like an actual ID card. */}
      <div className="flex flex-1 gap-3 p-3">
        <div className="flex flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2.5">
            {student.profilePhoto ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-primary/20">
                <Image src={student.profilePhoto} alt="" fill sizes="48px" className="object-cover" unoptimized />
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
              <p className="truncate text-[14px] font-bold leading-tight text-foreground">{student.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{className ?? '—'}{section ? ` · ${section}` : ''}</p>
              {showBloodGroup && student.bloodGroup && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-[8px] font-semibold text-danger">
                  <Droplet size={8} /> {student.bloodGroup}
                </span>
              )}
            </div>
          </div>

          <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9.5px] leading-tight">
            <Field label="Login ID" value={student.systemId} />
            <Field label={`Roll No. (${className ?? 'Class'})`} value={student.rollNumber} />
            {showNationalId && student.nationalIdNumber && (
              <Field label={`${nationalIdLabel} No.`} value={student.nationalIdNumber} className="col-span-2" />
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

        {/* QR side panel — minimum ~2cm on-screen equivalent so it prints scannable at real card size */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border pl-3">
          <QRCode value={student.qr} size={80} />
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
