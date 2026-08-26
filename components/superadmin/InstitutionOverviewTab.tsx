'use client';

import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type InstitutionDetail } from '@/store/api/superadminApi';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Row, fallbackBadge } from './InstitutionDetailShared';

/** Overview tab — contact info + a quick subscription summary. */
export function InstitutionOverviewTab({ inst }: { inst: InstitutionDetail['institution'] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Email" value={inst.contactEmail} />
          <Row label="Phone" value={inst.contactPhone} />
          <Row label="City" value={inst.city} />
          <Row label="Province" value={inst.province} />
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
          <Row label="Plan" value={inst.plan[0].toUpperCase() + inst.plan.slice(1)} />
          <Row label="Monthly" value={formatCurrency(inst.monthlyAmount)} />
          <Row label="Students limit" value={inst.studentsLimit ? String(inst.studentsLimit) : '—'} />
          <Row label="Status" value={fallbackBadge(inst.status).label} />
          <Row label="Trial ends" value={inst.trialEndsAt ? formatDate(inst.trialEndsAt) : '—'} />
        </CardContent>
      </Card>
    </div>
  );
}
