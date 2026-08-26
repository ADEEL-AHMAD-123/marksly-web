'use client';

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

export function InstitutionDetailView({ id }: { id: string }) {
  const { data, isLoading } = useGetInstitutionQuery(id);
  const [update, { isLoading: saving }] = useUpdateInstitutionMutation();
  const { data: planHistoryRes } = useGetPlanHistoryQuery(id);
  const planHistory = planHistoryRes?.data ?? [];
  const d = data?.data as InstitutionDetail | undefined;

  const setStatus = async (status: string) => {
    try { await update({ id, body: { status } }).unwrap(); toast.success('Status updated'); }
    catch { toast.error('Could not update status'); }
  };
  const setPlan = async (planType: string) => {
    // This is a direct administrative override, not a payment — no charge
    // is recorded (a fake "successful payment" used to appear in the
    // institution's own payment history from this exact action, which was
    // misleading). Worth a real confirmation rather than a one-click
    // dropdown change, since it immediately grants entitlements and
    // changes what the institution is billed for going forward.
    if (!window.confirm(
      `Change this institution to the "${planType}" plan?\n\nThis is an administrative override — it takes effect immediately and does NOT record a payment. Use this for comp accounts or deals handled outside Marksly, not as a substitute for the institution actually paying.`
    )) return;
    try { await update({ id, body: { planType } }).unwrap(); toast.success('Plan updated — no payment was recorded'); }
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
          <InstitutionOverviewTab inst={inst} />
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
    </div>
  );
}
