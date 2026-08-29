'use client';

import { useState } from 'react';
import { GraduationCap, School, Wallet, CalendarCheck, Award, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AreaTrendChart, BarsChart, DonutChart } from '@/components/charts/charts';
import { useGetReportsQuery } from '@/store/api/reportsApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import { formatCurrency } from '@/lib/utils';
import type { GradingSchemeType } from '@/store/api/gradingSchemesApi';

// Mirrors AcademicYearView.tsx's SCHEME_TYPE_INFO titles so a scheme type is
// labeled identically everywhere in the product.
const SCHEME_TYPE_LABEL: Record<GradingSchemeType, string> = {
  percentage_letter: 'Percentage → Letter',
  gpa: 'GPA',
  cambridge: 'Cambridge',
  pass_fail: 'Pass / Fail',
};

function Legend({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(--chart-${(i % 5) + 1}))` }} />
          <span className="truncate text-muted-foreground">{d.name}</span>
          <span className="ml-auto font-medium text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportsView({ title = 'Reports' }: { title?: string }) {
  const [termId, setTermId] = useState('all');
  const { data, isLoading } = useGetReportsQuery({ termId: termId === 'all' ? undefined : termId });
  const { data: termsRes } = useGetTermsQuery();
  // Show ALL terms (not just active) — an admin may want to review a
  // recently-closed term's report.
  const terms = termsRes?.data ?? [];
  const r = data?.data;

  const termFilter = (
    <Card className="p-4">
      <div className="max-w-xs">
        <Select value={termId} onValueChange={setTermId}>
          <SelectTrigger><SelectValue placeholder="All terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All terms</SelectItem>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}{t.status !== 'active' ? ` (${t.status})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );

  if (isLoading || !r) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description="Insights across your institution." />
        {termFilter}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-16 w-full" /></Card>)}
        </div>
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  const { overview, attendanceTrend, feeCollection, studentsByClass, gradeDistribution } = r;

  return (
    <div className="space-y-6">
      <PageHeader title={title} description="Insights across your institution." />

      {termFilter}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Active Students" value={overview.activeStudents.toLocaleString('en-PK')} icon={GraduationCap} tone="primary" />
        <StatCard label="Classes" value={overview.classes} icon={School} tone="info" />
        <StatCard label="Collected (mo)" value={formatCurrency(overview.collectedThisMonth)} icon={Wallet} tone="success" />
        <StatCard label="Avg Attendance" value={`${overview.avgAttendance}%`} icon={CalendarCheck} tone="warning" />
        <StatCard label="Pass Rate" value={`${overview.passRate}%`} icon={Award} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Present rate, last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceTrend.length ? (
              <AreaTrendChart data={attendanceTrend} xKey="label" yKey="rate" />
            ) : (
              <EmptyState icon={BarChart3} title="No attendance data yet" description="Mark attendance to see trends here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Collection</CardTitle>
            <CardDescription>Last 6 months (PKR)</CardDescription>
          </CardHeader>
          <CardContent>
            {feeCollection.some((f) => f.amount > 0) ? (
              <BarsChart data={feeCollection} xKey="label" yKey="amount" />
            ) : (
              <EmptyState icon={BarChart3} title="No payments yet" description="Collect fees to see collection trends." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students by Class</CardTitle>
            <CardDescription>Active enrolment</CardDescription>
          </CardHeader>
          <CardContent>
            {studentsByClass.length ? (
              <>
                <DonutChart data={studentsByClass} />
                <Legend data={studentsByClass} />
              </>
            ) : (
              <EmptyState icon={BarChart3} title="No students yet" />
            )}
          </CardContent>
        </Card>

        {/* One card per grading scheme type present — grades from different
            scheme types (e.g. percentage_letter's "A" vs. pass_fail's
            "Pass") are never meaningful in the same chart, so each type
            that has results gets its own labeled section. */}
        {(Object.keys(gradeDistribution) as GradingSchemeType[]).length ? (
          (Object.keys(gradeDistribution) as GradingSchemeType[]).map((type) => {
            const data = gradeDistribution[type] ?? [];
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle>Grade Distribution — {SCHEME_TYPE_LABEL[type] ?? type}</CardTitle>
                  <CardDescription>Across entered results for this grading type</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.length ? (
                    <>
                      <DonutChart data={data} />
                      <Legend data={data} />
                    </>
                  ) : (
                    <EmptyState icon={BarChart3} title="No results yet" description="Enter exam results to see grade spread." />
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Across published results</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState icon={BarChart3} title="No results yet" description="Enter exam results to see grade spread." />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
