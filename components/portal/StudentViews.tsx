'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { InfoNote } from '@/components/ui/info-note';
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
      <InfoNote title="Why does 'Late' lower my percentage?">
        <p>
          Your attendance rate only counts periods marked <strong>Present</strong>. Being marked{' '}
          <strong>Late</strong> or on <strong>Leave</strong> is recorded separately from an absence, but neither
          one counts toward your percentage the way Present does — so a term with a lot of late marks can still
          show a lower rate than you'd expect.
        </p>
      </InfoNote>
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
  const { data, isLoading, isError, error, refetch } = useMyOnlineExamsQuery();
  return (
    <div className="space-y-6">
      <PageHeader title="Online Exams" description="Exams scheduled for your class that you can take in the app." />
      <OnlineExamsList data={data?.data} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    </div>
  );
}

export function StudentResultsView() {
  const { data, isLoading } = useMyResultsQuery();
  const { data: cgpaData, isLoading: cgpaLoading } = useMyCgpaQuery();
  return (
    <div className="space-y-6">
      <PageHeader title="My Results" description="Your published exam results." />
      <InfoNote title="Why can't I see a result yet?">
        <p>
          A result only appears here once the exam is <strong>published</strong> — and even then, your school can
          individually hold back a single result (for example, while waiting on an external grade), so it can stay
          hidden a little longer than the rest of your exam. If you expected a result and don't see it, ask your
          teacher or school office rather than assuming something went wrong.
        </p>
      </InfoNote>
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
      <InfoNote title="Paid online but it still shows as due?">
        <p>
          After you pay online, this page confirms the result the moment you're brought back to it. If the payment
          gateway is slow to respond, the invoice may briefly still show as <strong>Pending</strong> — it updates on
          its own within a few minutes once the payment is confirmed, no need to pay again.
        </p>
      </InfoNote>
      <FeesList data={data?.data} isLoading={isLoading} />
    </div>
  );
}
