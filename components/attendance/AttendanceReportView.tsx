'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, MessageCircle, Phone, Users, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoNote } from '@/components/ui/info-note';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetClassesQuery } from '@/store/api/classesApi';
import {
  useGetAttendanceReportQuery,
  useLazyGetAttendanceReportQuery,
  type AttendanceStatus,
  type AttendanceReportRow,
} from '@/store/api/attendanceApi';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';

// "Today" in institution-timezone (Asia/Karachi, UTC+5) terms, not the
// browser's own UTC/local date — mirrors the backend's karachiTodayStr()
// (attendance.helpers.ts) and AttendanceView.tsx's own todayStr(), so this
// report's date-range `max` never caps a day behind the real current day
// in Karachi during the UTC 19:00–23:59 window (Karachi already past
// midnight into the next day).
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;
const todayStr = () => new Date(Date.now() + KARACHI_OFFSET_MS).toISOString().slice(0, 10);

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

const CSV_HEADERS = [
  'Date', 'Class', 'Section', 'Student Name', 'Roll No', 'Admission No',
  'Subject', 'Start Time', 'End Time', 'Status', 'Guardian Name(s)', 'Guardian Phone(s)', 'Note',
];

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Date, then class, then section, then roll number — a school handing this
// off outside the app reads it as "for each day, for each class/section,
// who was what", not a flat dump in whatever order the API happened to
// return records.
function sortForExport(rows: AttendanceReportRow[]): AttendanceReportRow[] {
  return [...rows].sort((a, b) =>
    a.date.localeCompare(b.date)
    || (a.className ?? '').localeCompare(b.className ?? '')
    || (a.sectionName ?? '').localeCompare(b.sectionName ?? '')
    || a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );
}

function toCsv(rows: AttendanceReportRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const r of sortForExport(rows)) {
    lines.push(
      [
        r.date,
        r.className ?? '',
        r.sectionName ?? '',
        r.studentName,
        r.rollNumber,
        r.admissionNumber,
        r.subject ?? '',
        r.startTime ?? '',
        r.endTime ?? '',
        r.status,
        r.guardians.map((g) => g.name).filter(Boolean).join('; '),
        r.guardians.map((g) => g.phone).filter(Boolean).join('; '),
        r.note ?? '',
      ]
        .map((v) => csvCell(String(v ?? '')))
        .join(',')
    );
  }
  return lines.join('\r\n');
}

function downloadCsv(filename: string, csv: string) {
  // Prepend a UTF-8 BOM -- without it, Excel (still the realistic target
  // for a school admin) mis-decodes non-ASCII guardian/student names.
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AttendanceReportView() {
  const terminology = useTerminology();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isTeacher = role === 'teacher';

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [status, setStatus] = useState<AttendanceStatus | 'all'>('absent');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data: classesRes } = useGetClassesQuery(undefined, { skip: isTeacher });
  const classes = useMemo<{ id: string; name: string; termType: string | null; sections: { id: string; name: string }[] }[]>(() => {
    if (isTeacher) return [];
    const src: any[] = classesRes?.data ?? [];
    return src.map((c) => ({
      id: c.id,
      name: c.name,
      termType: c.termType ?? null,
      sections: (c.sections ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    }));
  }, [isTeacher, classesRes]);
  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? terminology.section;

  // `isFetching` would also flip true on a background refocus-refetch (see
  // baseApi.ts's refetchOnFocus) with the exact same filters still applied,
  // flashing this table back to a skeleton for no visible reason. `isLoading`
  // still covers "new filters, no cached result for them yet" correctly —
  // RTK Query treats a different filter combination as a different cache
  // entry, so isLoading goes true again whenever dateFrom/dateTo/classId/
  // sectionId/status actually change.
  const { data, isLoading, isFetching, isError, refetch } = useGetAttendanceReportQuery({
    dateFrom,
    dateTo,
    classId: isTeacher ? undefined : classId || undefined,
    sectionId: isTeacher ? undefined : sectionId || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });
  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const [triggerReport, { isFetching: exporting }] = useLazyGetAttendanceReportQuery();

  // Exports every matching record for the current filters, not just the
  // page on screen -- an admin downloading "this month's absences" for a
  // whole institution needs the whole thing, not 50 rows at a time.
  // `total` already reflects the full filtered count (the backend computes
  // it before paginating), so one extra request with that as the limit
  // gets everything in one go.
  const handleDownload = async () => {
    if (total === 0) return;
    try {
      const result = await triggerReport({
        dateFrom,
        dateTo,
        classId: isTeacher ? undefined : classId || undefined,
        sectionId: isTeacher ? undefined : sectionId || undefined,
        status: status === 'all' ? undefined : status,
        page: 1,
        limit: total,
      }).unwrap();
      const allRows = result?.data ?? [];
      if (allRows.length === 0) {
        toast.error('Nothing to export for these filters');
        return;
      }
      downloadCsv(`attendance-report_${dateFrom}_to_${dateTo}.csv`, toCsv(allRows));
    } catch {
      toast.error('Could not export the report — please try again');
    }
  };

  // Any filter change should land back on page 1 — otherwise narrowing
  // e.g. from "All statuses" to "Absent" while sitting on page 4 of the
  // wider result set could land on an empty or out-of-range page.
  const resetPage = () => setPage(1);

  // Grouped by date (within the current page only — pagination stays
  // server-side) so a multi-day range reads as scannable per-day sections
  // instead of one flat list repeating the same date string on every row.
  // Preserves the server's own ordering within each date.
  const groupedByDate = useMemo(() => {
    const groups: { date: string; rows: typeof rows }[] = [];
    const byDate = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!byDate.has(r.date)) {
        byDate.set(r.date, []);
        groups.push({ date: r.date, rows: byDate.get(r.date)! });
      }
      byDate.get(r.date)!.push(r);
    }
    return groups;
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Toolbar — purely instrumental (filter the report), kept visually
          lighter than the cards below it, same convention as the admin
          dashboard's Classes/Subjects/ID Cards/Timetable pages. */}
      <div className="flex items-center justify-between gap-2 no-print">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Showing <Badge variant={statusBadge[status as AttendanceStatus] ?? 'neutral'} className="capitalize">
            {status === 'all' ? 'all statuses' : status}
          </Badge> only — change &quot;Status&quot; below to see everyone.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            disabled={total === 0}
            onClick={handleDownload}
            title="Download every matching record (not just this page) as a CSV file"
          >
            <Download size={16} /> Download CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={rows.length === 0}>
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 no-print">
        <div className={cn('grid grid-cols-1 gap-3', isTeacher ? 'sm:grid-cols-3' : 'sm:grid-cols-5')}>
          <div>
            <Label htmlFor="from">From</Label>
            <input
              id="from"
              type="date"
              value={dateFrom}
              max={todayStr()}
              onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
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
              onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {!isTeacher && (
            <>
              <div>
                <Label>{terminology.classUnit}</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); resetPage(); }}>
                  <SelectTrigger><SelectValue placeholder={`All ${terminology.classUnitPlural.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{sectionLabel}</Label>
                <Select value={sectionId} onValueChange={(v) => { setSectionId(v); resetPage(); }} disabled={!classId}>
                  <SelectTrigger><SelectValue placeholder={`All ${sectionLabel.toLowerCase()}${sectionLabel.toLowerCase().endsWith('s') ? '' : 's'}`} /></SelectTrigger>
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
            <Select value={status} onValueChange={(v) => { setStatus(v as AttendanceStatus | 'all'); resetPage(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
        <div className={cn(isFetching && 'opacity-60')}>
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <Card key={group.date} className="divide-y divide-border overflow-hidden p-0">
              <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.date} <span className="font-normal normal-case">· {group.rows.length} record{group.rows.length === 1 ? '' : 's'}</span>
              </div>
              {group.rows.map((r, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{r.studentName}</p>
                      <Badge variant={statusBadge[r.status]} className="capitalize">{r.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.rollNumber} · {r.className}{r.sectionName ? `-${r.sectionName}` : ''}
                      {r.subject ? ` · ${r.subject}` : ''}
                      {r.startTime ? ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ''}` : ''}
                    </p>
                    {r.note && <p className="mt-1 text-xs text-muted-foreground">Note: {r.note}</p>}
                  </div>

                  {r.guardians.length > 0 && (
                    <div className="flex flex-wrap gap-2 no-print">
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
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between no-print">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} record{total === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
        </div>
      )}

      {!isTeacher && (
        <InfoNote title="What does this report actually show?">
          <p>
            Only the status you&apos;ve picked above (default: Absent) shows — Present/Late/Leave records exist too,
            switch &quot;Status&quot; to &quot;All statuses&quot; to see everything for the selected range.
          </p>
          <p>
            The 24-hour edit lock only applies to <strong>teachers</strong> — as an admin you can still correct any
            of these records regardless of how old they are, from the &quot;Mark attendance&quot; tab.
          </p>
        </InfoNote>
      )}
    </div>
  );
}
