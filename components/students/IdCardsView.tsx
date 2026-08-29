'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Printer, CreditCard as IdCardIcon, Droplet, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
import { useTerminology } from '@/lib/terminology';

// CR80 (standard ID card) size: 85.6mm x 54mm, ratio ~1.586:1.
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 54;

// The on-screen preview uses the same ratio at a larger, legible size; the
// print stylesheet below pins every card to the REAL physical dimensions
// (not just responsive flex/grid sizing) so what comes out of the printer is
// an actual CR80-sized card, and lays out a fixed grid of them per page.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  #id-card-print, #id-card-print * { visibility: visible !important; }
  #id-card-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, ${CARD_WIDTH_MM}mm);
    gap: 6mm;
  }
  .no-print { display: none !important; }
  .id-card {
    break-inside: avoid;
    width: ${CARD_WIDTH_MM}mm !important;
    height: ${CARD_HEIGHT_MM}mm !important;
    box-shadow: none !important;
    border: 1px solid #999 !important;
  }
}`;

export function IdCardsView() {
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const sections = useMemo(() => classes.find((c) => c.id === classId)?.sections ?? [], [classes, classId]);
  const ready = !!classId && !!sectionId;
  const { data, isFetching } = useGetIdCardsQuery({ classId, sectionId }, { skip: !ready });
  const sheet = data?.data;
  const students = sheet?.students ?? [];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print">
        <PageHeader
          title="ID Cards"
          description="Generate and print student ID cards with a scannable, verifiable QR code."
          actions={
            students.length > 0
              ? <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print {students.length} cards</Button>
              : undefined
          }
        />
      </div>

      <Card className="p-4 no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {!ready ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Select a class and section" description="Choose a class and section to generate printable ID cards." /></Card>
      ) : isFetching && students.length === 0 ? (
        <Card className="p-5 no-print"><Skeleton className="h-64 w-full" /></Card>
      ) : students.length === 0 ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="No students" description="This section has no active students." /></Card>
      ) : (
        <div id="id-card-print" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => (
            <IdCardItem
              key={s.id}
              student={s}
              institution={sheet!.institution}
              className={sheet!.className}
              section={sheet!.section}
              termName={sheet!.termName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IdCardItem({
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
      <div className="flex items-center gap-2 border-b-[3px] border-accent bg-primary px-3 py-1.5 text-primary-foreground">
        {institution.logoUrl ? (
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white/10">
            <Image src={institution.logoUrl} alt="" fill sizes="28px" className="object-contain" unoptimized />
          </div>
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
            <GraduationCap size={17} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight">{institution.name}</p>
          <p className="text-[8.5px] font-medium uppercase leading-tight tracking-wide opacity-80">
            Student Identity Card{termName ? ` · ${termName}` : ` · ${termLabel}`}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-2.5 p-2.5">
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2">
            <Avatar initials={`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-tight text-foreground">{student.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{className ?? '—'}{section ? ` · ${section}` : ''}</p>
            </div>
          </div>

          <dl className="mt-0.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[9.5px] leading-tight">
            <Field label="Student ID" value={student.systemId} />
            <Field label={`Roll No. (${className ?? 'Class'})`} value={student.rollNumber} />
            <Field label="Admission #" value={student.admissionNumber} />
            {student.bloodGroup && (
              <div className="flex flex-col gap-0.5">
                <dt className="font-medium uppercase tracking-wide text-muted-foreground">Blood Group</dt>
                <dd className="flex items-center gap-1 font-semibold text-foreground">
                  <Droplet size={10} className="shrink-0 text-danger" /> {student.bloodGroup}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* QR side panel — minimum ~2cm on-screen equivalent so it prints scannable at real card size */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border pl-2.5">
          <QRCode value={student.qr} size={76} />
          <p className="text-center text-[6.5px] leading-tight text-muted-foreground">Scan to verify</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold text-foreground">{value}</dd>
    </div>
  );
}
