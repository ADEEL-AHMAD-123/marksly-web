'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, GraduationCap, Users, School, BookOpen, Ban, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoNote } from '@/components/ui/info-note';
import {
  useGetInstitutionQuery, useUpdateInstitutionMutation, useGetPlanHistoryQuery,
  type InstitutionDetail,
} from '@/store/api/superadminApi';
import { formatDate } from '@/lib/utils';
import { fallbackBadge, SearchableTable } from './InstitutionDetailShared';
import { InstitutionOverviewTab } from './InstitutionOverviewTab';
import { InstitutionClassesTab } from './InstitutionClassesTab';
import { InstitutionStudentsTab } from './InstitutionStudentsTab';
import { InstitutionBillingTab } from './InstitutionBillingTab';
import { ChangePlanOverrideDialog } from './ChangePlanOverrideDialog';

export function InstitutionDetailView({ id }: { id: string }) {
  // Activity/health monitoring view — freshness of lastActivityAt and
  // email-failure counts matters more than avoiding a redundant request,
  // so always refetch on mount/arg-change instead of relying on the
  // default cache window.
  const { data, isLoading } = useGetInstitutionQuery(id, { refetchOnMountOrArgChange: true });
  const [update, { isLoading: saving }] = useUpdateInstitutionMutation();
  const { data: planHistoryRes } = useGetPlanHistoryQuery(id);
  const planHistory = planHistoryRes?.data ?? [];
  const d = data?.data as InstitutionDetail | undefined;
  const [planOverrideTarget, setPlanOverrideTarget] = useState<string | null>(null);

  const setStatus = async (status: string) => {
    try { await update({ id, body: { status } }).unwrap(); toast.success('Status updated'); }
    catch { toast.error('Could not update status'); }
  };
  // setPlan is called directly from InstitutionBillingTab's plan Select —
  // this just opens the confirm dialog with the chosen plan; the actual
  // override happens in confirmPlanOverride below once the superadmin
  // confirms it there.
  const setPlan = (planType: string) => setPlanOverrideTarget(planType);

  const confirmPlanOverride = async () => {
    const planType = planOverrideTarget;
    if (!planType) return;
    try {
      const res = await update({ id, body: { planType } }).unwrap();
      toast.success('Plan updated — no payment was recorded');
      setPlanOverrideTarget(null);
      // Heads-up only (mirrors the self-serve downgrade warning in
      // BillingView.tsx) — the override already applied immediately above,
      // this can't block it, it just tells the superadmin the institution
      // is now over the new plan's student limit so new student creation
      // will be blocked until resolved.
      const overStudentLimit = res?.data?.overStudentLimit;
      if (overStudentLimit) {
        toast(
          `Heads up: this institution now has ${overStudentLimit} student${overStudentLimit === 1 ? '' : 's'} over the "${planType}" plan's limit. New student creation will be blocked until resolved.`,
          { icon: '⚠️', duration: 8000 }
        );
      }
    }
    catch { toast.error('Could not update plan'); }
  };

  if (isLoading || !d) {
    return (
      <div className="space-y-6">
        <Link href="/superadmin/institutions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Institutions</Link>
        <Card className="p-5"><Skeleton className="h-20 w-full" /></Card>
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  const inst = d.institution;

  return (
    <div className="space-y-6">
      <Link href="/superadmin/institutions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> Institutions
      </Link>

      <PageHeader
        title={inst.name}
        description={`${inst.type} · ${inst.city ?? '—'} · joined ${formatDate(inst.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={fallbackBadge(inst.status).variant}>{fallbackBadge(inst.status).label}</Badge>
            {inst.status === 'suspended' ? (
              <Button size="sm" loading={saving} onClick={() => setStatus('active')}><CheckCircle2 size={16} /> Activate</Button>
            ) : (
              <Button size="sm" variant="danger" loading={saving} onClick={() => setStatus('suspended')}><Ban size={16} /> Suspend</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={d.counts.students} icon={GraduationCap} tone="primary" />
        <StatCard label="Teachers" value={d.counts.teachers} icon={Users} tone="info" />
        <StatCard label="Classes" value={d.counts.classes} icon={School} tone="success" />
        <StatCard label="Subjects" value={d.counts.subjects} icon={BookOpen} tone="warning" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <InstitutionOverviewTab
            inst={inst}
            lastActivityAt={d.lastActivityAt}
            cardStats={d.cardStats}
            recentEmailFailures={d.recentEmailFailures}
          />
        </TabsContent>

        <TabsContent value="classes">
          <InstitutionClassesTab classes={d.classes} />
        </TabsContent>

        <TabsContent value="subjects">
          <SearchableTable
            head={['Subject', 'Code', 'Class', 'Teacher']}
            rows={d.subjects.map((s) => [s.name, s.code ?? '—', s.className ?? 'All', s.teacherName ?? '—'])}
            placeholder="Search subjects…"
            empty="No subjects."
          />
        </TabsContent>

        <TabsContent value="teachers">
          <SearchableTable
            head={['Teacher', 'Phone', 'Email', 'Status']}
            rows={d.teachers.map((t) => [t.name, t.phone, t.email ?? '—', t.isActive ? 'Active' : 'Inactive'])}
            placeholder="Search teachers…"
            empty="No teachers."
          />
        </TabsContent>

        <TabsContent value="students">
          <InstitutionStudentsTab institutionId={inst.id} />
        </TabsContent>

        <TabsContent value="billing">
          <InstitutionBillingTab
            inst={inst}
            payments={d.payments}
            chargeAttempts={d.chargeAttempts}
            planHistory={planHistory}
            saving={saving}
            setPlan={setPlan}
          />
        </TabsContent>
      </Tabs>

      {/* Help — placed after the actual content, same bottom-of-page pattern
          as the admin dashboard's redesigned pages, not before it. */}
      <div className="space-y-2">
        <InfoNote title="What actually happens when you suspend an institution?">
          <p>
            Suspending puts the whole school into <strong>read-only mode immediately</strong> — every user there
            (admins, teachers, students, parents) can still log in and view their data, but any save, add, or change
            is blocked until you activate them again.
          </p>
          <p>
            This is meant as a deliberate hold — for example, over a billing dispute — that needs your decision to
            lift. Unlike an account that&apos;s simply overdue on payment, a suspended account stays locked even if
            someone there tries to pay; only clicking <strong>Activate</strong> here restores normal access.
          </p>
        </InfoNote>
      </div>

      <ChangePlanOverrideDialog
        open={!!planOverrideTarget}
        planType={planOverrideTarget ?? ''}
        onClose={() => setPlanOverrideTarget(null)}
        onConfirm={confirmPlanOverride}
        loading={saving}
      />
    </div>
  );
}
