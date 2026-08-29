'use client';

import Image from 'next/image';
import { CheckCircle2, ShieldAlert, ShieldOff, GraduationCap } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import type { VerifyResult } from '@/app/verify/[code]/page';

export function VerifyResultView({ result }: { result: VerifyResult }) {
  const isActive = result.valid && result.status === 'active';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {result.valid ? (
          isActive ? (
            <ValidActiveState result={result} />
          ) : (
            <ValidInactiveState result={result} />
          )
        ) : (
          <InvalidState />
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-1">
        <Logo size={26} textClassName="text-sm" />
        <p className="text-center text-[11px] text-muted-foreground">
          Verified against Marksly&apos;s records.
        </p>
      </div>
    </div>
  );
}

function InstitutionBadge({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <div className="mb-5 flex flex-col items-center gap-2">
      {logoUrl ? (
        <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border bg-white">
          <Image src={logoUrl} alt="" fill sizes="56px" className="object-contain p-1.5" unoptimized />
        </div>
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <GraduationCap size={26} />
        </div>
      )}
      <p className="text-center text-sm font-semibold text-foreground">{name}</p>
    </div>
  );
}

function ValidActiveState({ result }: { result: Extract<VerifyResult, { valid: true }> }) {
  const isStudent = result.type === 'student';
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Valid ID Card</h1>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
        This is a valid ID card issued by {result.institutionName ?? 'the institution'}.
      </p>

      <div className="my-6 h-px bg-border" />

      <InstitutionBadge name={result.institutionName ?? 'Institution'} logoUrl={result.institutionLogoUrl} />

      <div className="rounded-xl border border-border bg-background p-4 text-left">
        {isStudent ? (
          <>
            <Row label="Student" value={result.studentName} />
            <Row label="Class" value={result.className} />
            <Row label="Section" value={result.sectionName} />
          </>
        ) : (
          <>
            <Row label="Name" value={result.personName} />
            <Row label="Role" value={result.role} className="capitalize" />
            <Row label="Department" value={result.department} />
          </>
        )}
      </div>
    </div>
  );
}

function ValidInactiveState({ result }: { result: Extract<VerifyResult, { valid: true }> }) {
  const isStudent = result.type === 'student';
  const personLabel = isStudent ? 'student' : 'staff member';
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft text-warning">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Card Issued, Not Currently Active</h1>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
        This ID was genuinely issued by {result.institutionName ?? 'the institution'}, but the {personLabel} is no
        longer currently {isStudent ? 'enrolled' : 'active'}{result.status ? ` (status: ${result.status})` : ''}.
      </p>

      <div className="my-6 h-px bg-border" />

      <InstitutionBadge name={result.institutionName ?? 'Institution'} logoUrl={result.institutionLogoUrl} />

      <div className="rounded-xl border border-border bg-background p-4 text-left">
        {isStudent ? (
          <>
            <Row label="Student" value={result.studentName} />
            <Row label="Class" value={result.className} />
            <Row label="Section" value={result.sectionName} />
          </>
        ) : (
          <>
            <Row label="Name" value={result.personName} />
            <Row label="Role" value={result.role} className="capitalize" />
            <Row label="Department" value={result.department} />
          </>
        )}
        <Row label="Status" value={result.status} className="capitalize" />
      </div>
    </div>
  );
}

function InvalidState() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <ShieldOff size={32} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Could Not Verify This Card</h1>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
        This code could not be verified — it may be invalid or altered. Do not treat this as a genuine ID card
        without confirming directly with the institution.
      </p>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`truncate font-medium text-foreground ${className ?? ''}`}>{value}</span>
    </div>
  );
}
