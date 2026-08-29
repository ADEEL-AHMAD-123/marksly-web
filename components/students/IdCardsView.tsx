'use client';

import { useMemo, useState } from 'react';
import { Printer, CreditCard as IdCardIcon, Droplet } from 'lucide-react';
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
import { LogoMark } from '@/components/brand/Logo';
import { QRCode } from '@/components/ui/qr-code';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetIdCardsQuery, type IdCard } from '@/store/api/studentsApi';
import { useTerminology } from '@/lib/terminology';

// Print rules: hide the app chrome and show only the card sheet.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #id-card-print, #id-card-print * { visibility: visible !important; }
  #id-card-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
  .no-print { display: none !important; }
  .id-card { break-inside: avoid; }
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
          description="Generate and print student ID cards with a scannable QR code."
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
        <div id="id-card-print" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => (
            <IdCardItem
              key={s.id}
              student={s}
              institution={sheet!.institution.name}
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
}: { student: IdCard; institution: string; className: string | null; section: string | null; termName: string | null }) {
  const [first = '', last = ''] = student.name.split(' ');
  const { term: termLabel } = useTerminology();
  return (
    <div className="id-card overflow-hidden rounded-xl border border-border bg-card">
      {/* Header band */}
      <div className="flex items-center gap-2 bg-primary px-3 py-2 text-primary-foreground">
        <LogoMark size={22} variant="tile" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{institution}</p>
          <p className="text-[10px] uppercase tracking-wide opacity-80">Student Identity Card</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-3 p-3">
        <Avatar initials={`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{student.name}</p>
          <p className="text-xs text-muted-foreground">{className ?? '—'}{section ? ` · ${section}` : ''}</p>
          <dl className="mt-1.5 space-y-0.5 text-xs">
            <Field label="Roll #" value={student.rollNumber} />
            <Field label="Adm #" value={student.admissionNumber} />
            {termName && <Field label={termLabel} value={termName} />}
            {student.bloodGroup && (
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">Blood</dt>
                <dd className="flex items-center gap-0.5 font-medium text-foreground"><Droplet size={11} className="text-danger" /> {student.bloodGroup}</dd>
              </div>
            )}
          </dl>
        </div>
        <QRCode value={student.qr} size={72} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
