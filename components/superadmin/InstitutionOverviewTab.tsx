'use client';

import { Wallet, CreditCard, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type InstitutionDetail } from '@/store/api/superadminApi';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { getTerminology, type AcademicStructure } from '@/lib/terminology';
import { Row } from './InstitutionDetailShared';

// Friendly labels for the academic structure enum — mirrors terminology.ts's
// own per-structure language so a superadmin sees the same "what kind of
// school is this" framing the institution itself sees, without duplicating
// the term/section vocabulary here.
const academicStructureLabel: Record<AcademicStructure, string> = {
  yearly: 'Yearly',
  semester: 'Semester-based',
  short_session: 'Short session (batches)',
  custom: 'Custom',
};

/** Overview tab — contact info, subscription basics, ID card configuration,
 *  and platform-activity/health signals. Plan + Status live on the Billing
 *  tab only (financial/plan home) to avoid showing the same two fields
 *  twice across tabs. */
export function InstitutionOverviewTab({
  inst, lastActivityAt, cardStats, recentEmailFailures,
}: {
  inst: InstitutionDetail['institution'];
  lastActivityAt: InstitutionDetail['lastActivityAt'];
  cardStats: InstitutionDetail['cardStats'];
  recentEmailFailures: InstitutionDetail['recentEmailFailures'];
}) {
  const structureLabel = academicStructureLabel[inst.academicStructure] ?? getTerminology(inst.academicStructure).term;
  const { totalActiveStudents, expiringOrExpiredCards } = cardStats;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Email" value={inst.contactEmail} />
          <Row label="Phone" value={inst.contactPhone} />
          <Row label="Address" value={inst.address} />
          <Row label="City" value={inst.city} />
          <Row label="Province" value={inst.province} />
          <Row label="Academic structure" value={structureLabel} />
          {/* Subdomain routing isn't actually wired up yet (no DNS/middleware
              behind it) — showing `slug.marksly.pk` here looked like a live,
              working link when it isn't. Re-enable once subdomain routing is
              actually built. */}
          {/* <Row label="Subdomain" value={`${inst.slug}.marksly.pk`} /> */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet size={18} /> Subscription</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Monthly" value={formatCurrency(inst.monthlyAmount)} />
          <Row label="Students limit" value={inst.studentsLimit ? String(inst.studentsLimit) : '—'} />
          <Row label="Trial ends" value={inst.trialEndsAt ? formatDate(inst.trialEndsAt) : '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard size={18} /> ID card settings</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {inst.idCard ? (
            <>
              <Row label="National ID shown" value={inst.idCard.showNationalId ? 'Yes' : 'No'} />
              <Row label="Blood group shown" value={inst.idCard.showBloodGroup ? 'Yes' : 'No'} />
              <Row label="Student card validity" value={`${inst.idCard.studentValidityMonths} months`} />
              <Row label="Staff card validity" value={`${inst.idCard.staffValidityMonths} months`} />
              <Row label="Custom logo" value={inst.idCard.customLogoUrl ? 'Yes' : 'No'} />
              <Row label="Institute name shown" value={inst.idCard.showInstituteName ? 'Yes' : 'No'} />
            </>
          ) : (
            <p className="py-2.5 text-sm text-muted-foreground">Not configured.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity size={18} /> Activity &amp; health</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Last activity" value={lastActivityAt ? formatRelativeTime(lastActivityAt) : 'Never logged in'} />
          <div className="space-y-1 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Cards expired/expiring soon</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-right text-sm font-medium text-foreground',
                  expiringOrExpiredCards > 0 && 'bg-warning-soft text-warning'
                )}
              >
                {totalActiveStudents === 0 ? 'No active students' : expiringOrExpiredCards}
              </span>
            </div>
            {totalActiveStudents > 0 && (
              <p className="text-xs text-muted-foreground">
                {expiringOrExpiredCards} of {totalActiveStudents} active students have a card expired or expiring within 30 days.
              </p>
            )}
          </div>
          <div className="space-y-1 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Email failures (7 days)</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-right text-sm font-medium text-foreground',
                  recentEmailFailures > 0 && 'bg-warning-soft text-warning'
                )}
              >
                {recentEmailFailures}
              </span>
            </div>
            {recentEmailFailures > 0 && (
              <p className="text-xs text-muted-foreground">Per-email detail isn&apos;t available in this view.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
