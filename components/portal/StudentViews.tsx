'use client';

import { PageHeader } from '@/components/ui/page-header';
import { AttendanceHistory } from './AttendanceHistory';
import { ResultsList } from './ResultsList';
import { GpaSummary } from './GpaSummary';
import { FeesList } from './FeesList';
import { useMyAttendanceQuery, useMyResultsQuery, useMyCgpaQuery, useMyFeesQuery } from '@/store/api/portalApi';

export function StudentAttendanceView() {
  const { data, isLoading } = useMyAttendanceQuery();
  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Your attendance record." />
      <AttendanceHistory data={data?.data} isLoading={isLoading} />
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
