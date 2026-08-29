'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, MessageCircle, Phone, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import {
  useGetAttendanceReportQuery,
  type AttendanceStatus,
} from '@/store/api/attendanceApi';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS: { value: AttendanceStatus | 'all'; label: string }[] = [
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'leave', label: 'Leave' },
  { value: 'present', label: 'Present' },
  { value: 'all', label: 'All statuses' },
];

const statusBadge: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success', absent: 'danger', late: 'warning', leave: 'neutral',
};

// WhatsApp deep links need full international format with no leading zero
// (e.g. 923001234567, not 03001234567 or +923001234567). Phone numbers here
// are only validated as 10–15 digits at entry (see user.validator.ts), so
// plenty of real records are stored in local Pakistani format without a
// country code — normalize those, and leave anything that already looks
// international alone.
function waLink(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = `92${digits.slice(1)}`; // local 03XXXXXXXXX -> 923XXXXXXXXX
  } else if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`; // local number missing its leading 0 entirely
  }
  return `https://wa.me/${digits}`;
}

export function AttendanceReportView() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const isTeacher = role === 'teacher';

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [status, setStatus] = useState<AttendanceStatus | 'all'>('absent');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [termId, setTermId] = useState('all');

  const { data: termsRes } = useGetTermsQuery();
  // Show ALL terms (not just active) — same as ExamsView/ReportsView, so
  // e.g. a recently-closed term's attendance can still be pulled up.
  const terms = termsRes?.data ?? [];

  const { data: classesRes } = useGetClassesQuery(undefined, { skip: isTeacher });
  const classes = useMemo<{ id: string; name: string; sections: { id: string; name: string }[] }[]>(() => {
    if (isTeacher) return [];
    const src: any[] = classesRes?.data ?? [];
    return src.map((c) => ({
      id: c.id,
      name: c.name,
      sections: (c.sections ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    }));
  }, [isTeacher, classesRes]);
  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections ?? [],
    [classes, classId]
  );

  // `isFetching` would also flip true on a background refocus-refetch (see
  // baseApi.ts's refetchOnFocus) with the exact same filters still applied,
  // flashing this table back to a skeleton for no visible reason. `isLoading`
  // still covers "new filters, no cached result for them yet" correctly —
  // RTK Query treats a different filter combination as a different cache
  // entry, so isLoading goes true again whenever dateFrom/dateTo/classId/
  // sectionId/status actually change.
  const { data, isLoading, isError, refetch } = useGetAttendanceReportQuery({
    dateFrom,
    dateTo,
    classId: isTeacher ? undefined : classId || undefined,
    sectionId: isTeacher ? undefined : sectionId || undefined,
    status: status === 'all' ? undefined : status,
    termId: termId === 'all' ? undefined : termId,
  });
  const rows = data?.data.rows ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className={cn('grid grid-cols-1 gap-3', isTeacher ? 'sm:grid-cols-4' : 'sm:grid-cols-6')}>
          <div>
            <Label htmlFor="from">From</Label>
            <input
              id="from"
              type="date"
              value={dateFrom}
              max={todayStr()}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <input
              id="to"
              type="date"
              value={dateTo}
              max={todayStr()}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {!isTeacher && (
            <>
              <div>
                <Label>Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                  <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus | 'all')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term</Label>
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
        </div>
      </Card>

      {isError ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load report"
            description="Check the API connection and try again."
            action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
          />
        </Card>
      ) : isLoading ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No matching records"
            description="Try a wider date range or a different status."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{r.studentName}</p>
                  <Badge variant={statusBadge[r.status]} className="capitalize">{r.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.rollNumber} · {r.className}{r.sectionName ? `-${r.sectionName}` : ''}
                  {r.subject ? ` · ${r.subject}` : ''}
                  {r.startTime ? ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ''}` : ''} · {r.date}
                </p>
                {r.note && <p className="mt-1 text-xs text-muted-foreground">Note: {r.note}</p>}
              </div>

              {r.guardians.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.guardians.map((g, gi) => (
                    <div key={gi} className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs">
                      <span className="text-foreground">{g.name || 'Guardian'}</span>
                      {g.phone && (
                        <>
                          <span className="text-muted-foreground">{g.phone}</span>
                          <a
                            href={waLink(g.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-success-soft-foreground hover:opacity-90"
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                          <a
                            href={`tel:${g.phone}`}
                            className="flex items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-primary-soft-foreground hover:opacity-90"
                          >
                            <Phone size={12} /> Call
                          </a>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
