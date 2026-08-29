'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AttendanceHistory } from './AttendanceHistory';
import { ResultsList } from './ResultsList';
import { GpaSummary } from './GpaSummary';
import { FeesList } from './FeesList';
import { OnlineExamsList } from './OnlineExamsList';
import { useMyAttendanceQuery, useMyResultsQuery, useMyCgpaQuery, useMyFeesQuery } from '@/store/api/portalApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import { useMyOnlineExamsQuery } from '@/store/api/examAttemptApi';

export function StudentAttendanceView() {
  const [termId, setTermId] = useState('all');
  const { data: termsRes } = useGetTermsQuery();
  // Show ALL terms (not just active), same as AttendanceReportView/
  // ExamsView/ReportsView, so a recently-closed term is still reachable.
  const terms = termsRes?.data ?? [];

  const { data, isLoading, isFetching } = useMyAttendanceQuery({
    termId: termId === 'all' ? undefined : termId,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Your attendance record." />
      <Card className="p-4">
        <div className="max-w-xs">
          <Select value={termId} onValueChange={setTermId}>
            <SelectTrigger><SelectValue placeholder="All time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.status !== 'active' ? ` (${t.status})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
      {/* `isLoading` gates the full-card skeleton (first load / new term with
          no cached result yet); `isFetching` is passed through separately so
          AttendanceHistory can show a subtle updating state on the rate stat
          while a background refetch for the same term is in flight, instead
          of flashing the whole card back to a skeleton. */}
      <AttendanceHistory data={data?.data} isLoading={isLoading} isFetching={isFetching} />
    </div>
  );
}

export function StudentExamsView() {
  const { data, isLoading } = useMyOnlineExamsQuery();
  return (
    <div className="space-y-6">
      <PageHeader title="Online Exams" description="Exams scheduled for your class that you can take in the app." />
      <OnlineExamsList data={data?.data} isLoading={isLoading} />
    </div>
  );
}

export function StudentResultsView() {
  const { data, isLoading } = useMyResultsQuery();
  const { data: cgpaData, isLoading: cgpaLoading } = useMyCgpaQuery();
  return (
    <div className="space-y-6">
      <PageHeader title="My Results" description="Your published exam results." />
      <GpaSummary data={cgpaData?.data} isLoading={cgpaLoading} />
      <ResultsList data={data?.data} isLoading={isLoading} />
    </div>
  );
}

export function StudentFeesView() {
  const { data, isLoading } = useMyFeesQuery();
  return (
    <div className="space-y-6">
      <PageHeader title="My Fees" description="Your fee invoices and dues." />
      <FeesList data={data?.data} isLoading={isLoading} />
    </div>
  );
}
