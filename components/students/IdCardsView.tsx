'use client';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Printer, CreditCard as IdCardIcon, Droplet, GraduationCap, ImageOff, Search, X, UserCircle, Phone, MapPin, Users, RotateCw } from 'lucide-react';
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
import { useGetIdCardsQuery, type IdCard } from '@/store/api/studentsApi';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM, ID_CARD_PRINT_CSS, idCardNameSizeClass } from '@/components/shared/idCardPrint';
import { IdCardBack, type IdCardBackRow } from '@/components/shared/IdCardBack';
import { cn } from '@/lib/utils';
import { IdCardCredit } from '@/components/shared/IdCardCredit';

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

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />

      <Card className="space-y-3 p-4 no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <div>
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
      </Card>

      {!ready ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title={`Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()}`} description="Then search for a specific student to view their ID card." /></Card>
      ) : !selectedId ? (
        <Card className="no-print">
          <EmptyState
            icon={IdCardIcon}
            title="Search for a student"
            description="Type a name in the box above and pick the student whose card you want to view and print."
          />
        </Card>
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

function StudentIdCardPreview({
  student, institution, className, section, termName,
}: {
  student: IdCard;
  institution: { name: string; city: string | null; logoUrl: string | null };
  className: string | null;
  section: string | null;
  termName: string | null;
}) {
  const [showBack, setShowBack] = useState(false);
  const { term: termLabel } = useTerminology();

  return (
    <>
      <div className="no-print flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowBack((v) => !v)}>
          <RotateCw size={15} /> {showBack ? 'Show front' : 'Flip to back'}
        </Button>
        <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print card</Button>
      </div>
      <div id="id-card-print" className="flex justify-center">
        <div className="w-full max-w-sm space-y-4">
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
              rows={studentBackRows(student)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export function studentBackRows(student: IdCard): IdCardBackRow[] {
  const rows: IdCardBackRow[] = [];
  if (student.bloodGroup) rows.push({ icon: Droplet, label: 'Blood Group', value: student.bloodGroup });
  if (student.phone) rows.push({ icon: Phone, label: 'Phone', value: student.phone });
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
                <Avatar initials={s.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()} size="sm" />
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
  institution: { name: string; city: string | null; logoUrl: string | null };
  className: string | null;
  section: string | null;
  termName: string | null;
}) {
  const [first = '', last = ''] = student.name.split(' ');
  const { term: termLabel } = useTerminology();

  return (
    <div
      className="id-card mx-auto flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ aspectRatio: `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`, maxWidth: 380 }}
    >
      {/* Header band — institution branding, not Marksly's */}
      <div className="flex items-start gap-2 border-b-[3px] border-accent bg-primary px-3 py-1.5 text-primary-foreground">
        {institution.logoUrl ? (
          <div className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white/10">
            <Image src={institution.logoUrl} alt="" fill sizes="28px" className="object-contain" unoptimized />
          </div>
        ) : (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
            <GraduationCap size={17} />
          </div>
        )}
        <div className="min-w-0">
          <p className={cn('line-clamp-2 break-words font-bold leading-[1.15]', idCardNameSizeClass(institution.name))}>
            {institution.name}
          </p>
          <p className="mt-0.5 text-[8.5px] font-medium uppercase leading-tight tracking-wide opacity-80">
            Student Identity Card{termName ? ` · ${termName}` : ` · ${termLabel}`}
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
              {student.bloodGroup && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-[8px] font-semibold text-danger">
                  <Droplet size={8} /> {student.bloodGroup}
                </span>
              )}
            </div>
          </div>

          <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9.5px] leading-tight">
            <Field label="Student ID" value={student.systemId} />
            <Field label={`Roll No. (${className ?? 'Class'})`} value={student.rollNumber} />
            <Field label="Admission #" value={student.admissionNumber} className="col-span-2" />
          </dl>

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
