'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ChevronDown, MessageCircle, Phone, Users, Printer, Download, LayoutGrid, Clock, BookOpen, Hash, Filter, UserCheck, List, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoNote } from '@/components/ui/info-note';
import { SearchInput } from '@/components/ui/search-input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetClassesQuery } from '@/store/api/classesApi';
import {
  useGetAttendanceReportQuery,
  useLazyGetAttendanceReportQuery,
  useGetAttendanceCoverageTodayQuery,
  type AttendanceStatus,
  type AttendanceReportRow,
} from '@/store/api/attendanceApi';
import { useAppSelector } from '@/store/hooks';
import { cn, formatDate } from '@/lib/utils';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';
import { todayStr } from '@/lib/institution-date';

// "Today" in institution-timezone (Asia/Karachi, UTC+5) terms, not the
// browser's own UTC/local date -- see lib/institution-date.ts for why.

const STATUS_OPTIONS: { value: AttendanceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'leave', label: 'Leave' },
];

const statusBadge: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success', absent: 'danger', late: 'warning', leave: 'neutral',
};
// 'leave' overrides the neutral variant above with the same bg-info/
// text-info-foreground classes AttendanceView.tsx's marking page uses
// for the identical status, so the two pages agree on its color.
const LEAVE_BADGE_CLASS = 'bg-info text-info-foreground';

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

/** Collapsed guardian-contact menu — same trigger used by both the card
 * and table layouts below, so there's exactly one place that knows how
 * to reach a student's guardians. Renders nothing when there are none. */
function GuardianContactMenu({ guardians }: { guardians: AttendanceReportRow['guardians'] }) {
  if (guardians.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Phone size={13} />
          Contact{guardians.length > 1 ? ` (${guardians.length})` : ''}
          <ChevronDown size={13} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {guardians.map((g, gi) => (
          <div key={gi}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{g.name || 'Guardian'}{g.phone ? ` · ${g.phone}` : ''}</DropdownMenuLabel>
            {g.phone ? (
              <>
                <DropdownMenuItem onSelect={() => window.open(waLink(g.phone!), '_blank', 'noopener,noreferrer')}>
                  <MessageCircle size={14} className="text-success" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { window.location.href = `tel:${g.phone}`; }}>
                  <Phone size={14} className="text-primary" /> Call
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>No phone on file</DropdownMenuItem>
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AttendanceReportView() {
  const terminology = useTerminology();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isTeacher = role === 'teacher';

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [status, setStatus] = useState<AttendanceStatus | 'all'>('all');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const PAGE_SIZE = 50;

  // Only meaningful for a single selected day (also the page's default
  // state) -- for a multi-day range there's no one "today" to summarize,
  // so the strip is hidden entirely rather than silently ignoring the
  // range like before.
  const isSingleDay = dateFrom === dateTo;
  const { data: coverageRes, isLoading: loadingCoverage } = useGetAttendanceCoverageTodayQuery(
    isSingleDay ? { date: dateFrom } : undefined,
    { skip: isTeacher || !isSingleDay },
  );
  const coverage = coverageRes?.data;
  const coverageIsToday = coverage?.date === todayStr();

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

  // Admin/staff must pick a specific class AND section before we run any
  // query -- otherwise leaving these two untouched silently pulled every
  // student in the institution into one report, which is almost never what
  // was intended (unlike the date range, which is safely defaulted to today).
  // Teachers are exempt: their own periods are already scoped server-side.
  const needsSelection = !isTeacher && (!classId || !sectionId);

  // `isFetching` would also flip true on a background refocus-refetch (see
  // baseApi.ts's refetchOnFocus) with the exact same filters still applied,
  // flashing this table back to a skeleton for no visible reason. `isLoading`
  // still covers "new filters, no cached result for them yet" correctly —
  // RTK Query treats a different filter combination as a different cache
  // entry, so isLoading goes true again whenever dateFrom/dateTo/classId/
  // sectionId/status actually change.
  const { data, isLoading, isFetching, isError, refetch } = useGetAttendanceReportQuery(
    {
      dateFrom,
      dateTo,
      classId: isTeacher ? undefined : classId || undefined,
      sectionId: isTeacher ? undefined : sectionId || undefined,
      status: status === 'all' ? undefined : status,
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { skip: needsSelection }
  );
  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;
  const statusCounts = data?.meta?.statusCounts;

  const [triggerReport, { isFetching: exporting }] = useLazyGetAttendanceReportQuery();

  // Exports every matching record for the current filters, not just the
  // page on screen -- an admin downloading "this month's absences" for a
  // whole institution needs the whole thing, not 50 rows at a time.
  // `total` already reflects the full filtered count (the backend computes
  // it before paginating), so one extra request with that as the limit
  // gets everything in one go.
  const handleDownload = async () => {
    if (needsSelection || total === 0) return;
    try {
      const result = await triggerReport({
        dateFrom,
        dateTo,
        classId: isTeacher ? undefined : classId || undefined,
        sectionId: isTeacher ? undefined : sectionId || undefined,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetPage(); }, [search]);

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
      {/* Coverage snapshot for the single selected day -- reacts to the
          date filter below (it's the same date, not a fixed "today"), and
          only shown when exactly one day is selected since a range has no
          single day to summarize. "Fully marked" is deliberately distinct
          from the present-rate, which is computed from whatever periods
          have been marked so far, complete or not -- otherwise "0 fully
          marked" next to a nonzero present rate reads as a contradiction. */}
      {!isTeacher && isSingleDay && !loadingCoverage && coverage && coverage.totalSections > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5 text-sm no-print">
          <Users size={15} className="shrink-0 text-muted-foreground" />
          <span className="text-foreground">
            {coverageIsToday ? 'Today' : formatDate(dateFrom)}: <strong>{coverage.markedSections}</strong> of{' '}
            <strong>{coverage.totalSections}</strong>{' '}
            {(coverage.totalSections === 1 ? terminology.section : terminology.sectionPlural).toLowerCase()} fully marked
          </span>
          <span className="text-muted-foreground">· {coverage.presentRate}% present in records marked so far</span>
        </div>
      )}

      {/* Toolbar — purely instrumental (filter the report), kept visually
          lighter than the cards below it, same convention as the admin
          dashboard's Classes/Subjects/ID Cards/Timetable pages. */}
      <div className="flex items-center justify-between gap-2 no-print">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {needsSelection ? (
            <>Pick a {terminology.classUnit.toLowerCase()} and {sectionLabel.toLowerCase()} below to see records.</>
          ) : (
            <>
              Showing <Badge
                variant={statusBadge[status as AttendanceStatus] ?? 'neutral'}
                className={cn('capitalize', status === 'leave' && LEAVE_BADGE_CLASS)}
              >
                {status === 'all' ? 'all statuses' : status}
              </Badge> only — change &quot;Status&quot; below to see everyone.
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView('cards')}
              aria-label="Card view"
              aria-pressed={view === 'cards'}
              title="Card view — one block per record"
              className={cn(
                'rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                view === 'cards' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              aria-label="Table view"
              aria-pressed={view === 'table'}
              title="Table view — denser, easier to scan a large report"
              className={cn(
                'rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                view === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Table2 size={16} />
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            disabled={needsSelection || total === 0}
            onClick={handleDownload}
            title="Download every matching record (not just this page) as a CSV file"
          >
            <Download size={16} /> Download CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={needsSelection || rows.length === 0}>
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 no-print">
        <div className="mb-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Find a student by name, roll no. or admission no…"
          />
        </div>
        <div className={cn('grid grid-cols-1 gap-3', isTeacher ? 'sm:grid-cols-3' : 'sm:grid-cols-5')}>
          <div>
            <Label htmlFor="from">From date</Label>
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
            <Label htmlFor="to">To date</Label>
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
                <Label htmlFor="report-class">{terminology.classUnit} <span className="font-normal normal-case text-danger">*</span></Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); resetPage(); }}>
                  <SelectTrigger id="report-class"><SelectValue placeholder={`All ${terminology.classUnitPlural.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="report-section">{sectionLabel} <span className="font-normal normal-case text-danger">*</span></Label>
                <Select value={sectionId} onValueChange={(v) => { setSectionId(v); resetPage(); }} disabled={!classId}>
                  <SelectTrigger id="report-section"><SelectValue placeholder={`All ${sectionLabel.toLowerCase()}${sectionLabel.toLowerCase().endsWith('s') ? '' : 's'}`} /></SelectTrigger>
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
            <Label htmlFor="report-status">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v as AttendanceStatus | 'all'); resetPage(); }}>
              <SelectTrigger id="report-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!needsSelection && !isLoading && !isError && total > 0 && status === 'all' && statusCounts && (
        <div className="flex flex-wrap items-center gap-2 text-xs no-print">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2 py-1 text-success-soft-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {statusCounts.present} present
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-soft px-2 py-1 text-danger-soft-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> {statusCounts.absent} absent
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-warning-soft-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> {statusCounts.late} late
          </span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1', LEAVE_BADGE_CLASS)}>
            <span className="h-1.5 w-1.5 rounded-full bg-info-foreground" /> {statusCounts.leave} leave
          </span>
          <span className="text-muted-foreground">— for the {total} record{total === 1 ? '' : 's'} matching the filters above</span>
        </div>
      )}

      {needsSelection ? (
        <Card>
          <EmptyState
            icon={Filter}
            title={`Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()}`}
            description={`Choose which ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()} to report on above — attendance for the whole institution at once isn't shown here.`}
          />
        </Card>
      ) : isError ? (
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
            description={
              search
                ? `Nothing found for "${search}" — check the spelling, or clear the search to see everyone in this range.`
                : 'Try a wider date range or a different status.'
            }
          />
        </Card>
      ) : (
        <div className={cn(isFetching && 'opacity-60')}>
        {view === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">Date</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="whitespace-nowrap px-3 py-2">{terminology.classUnit} / {sectionLabel}</th>
                  <th className="whitespace-nowrap px-3 py-2">Subject &amp; time</th>
                  <th className="whitespace-nowrap px-3 py-2">Status</th>
                  <th className="whitespace-nowrap px-3 py-2">Marked by</th>
                  <th className="whitespace-nowrap px-3 py-2 no-print">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.map((r, i) => (
                  <tr key={i} className="align-top hover:bg-muted/20">
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{r.studentName}</div>
                      <div className="text-xs text-muted-foreground">Roll {r.rollNumber} · Adm# {r.admissionNumber}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{r.className}{r.sectionName ? ` – ${r.sectionName}` : ''}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {r.subject ?? '—'}{r.startTime ? ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ''}` : ''}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={statusBadge[r.status]} className={cn('capitalize', r.status === 'leave' && LEAVE_BADGE_CLASS)}>{r.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{r.teacherName ?? '—'}</td>
                    <td className="px-3 py-2.5 no-print">
                      <GuardianContactMenu guardians={r.guardians} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <Card key={group.date} className="divide-y divide-border overflow-hidden p-0">
              <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.date} <span className="font-normal normal-case">· {group.rows.length} record{group.rows.length === 1 ? '' : 's'}</span>
              </div>
              {group.rows.map((r, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{r.studentName}</p>
                      <Badge variant={statusBadge[r.status]} className={cn('capitalize', r.status === 'leave' && LEAVE_BADGE_CLASS)}>{r.status}</Badge>
                    </div>

                    {/* Labeled fields, not a squashed muted-text line -- an
                        admin scanning a printed or on-screen report needs
                        "Class" and "Period" to jump out, not to be inferred
                        from an unlabeled string of dots. */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Hash size={12} /> Roll {r.rollNumber}
                        <span className="opacity-70">· Adm# {r.admissionNumber}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-primary-soft-foreground">
                        <LayoutGrid size={12} />
                        {r.className}{r.sectionName ? ` – ${r.sectionName}` : ''}
                      </span>
                      {r.subject && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <BookOpen size={12} /> {r.subject}
                        </span>
                      )}
                      {r.startTime && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock size={12} /> {r.startTime}{r.endTime ? `–${r.endTime}` : ''}
                        </span>
                      )}
                      {r.teacherName && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <UserCheck size={12} /> Marked by {r.teacherName}
                        </span>
                      )}
                    </div>

                    {r.note && <p className="mt-1.5 text-xs text-muted-foreground">Note: {r.note}</p>}
                  </div>

                  {r.guardians.length > 0 && (
                    <div className="no-print">
                      <GuardianContactMenu guardians={r.guardians} />
                    </div>
                  )}
                </div>
              ))}
            </Card>
          ))}
        </div>
        )}

        <div className="mt-4 flex items-center justify-between no-print">
          <p className="text-sm text-muted-foreground">
            {total} record{total === 1 ? '' : 's'}{totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
          </p>
          {totalPages > 1 && (
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
          )}
        </div>
        </div>
      )}

      <InfoNote title="What does this report actually show?">
        <p>
          {isTeacher
            ? 'This only covers periods you teach — change the date range above, or narrow it down with "Status" to just one kind of record.'
            : `It only covers the ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()} you've selected above — pick a different one to see another group, or change "Status" to narrow it down to just one kind of record.`}
        </p>
      </InfoNote>
    </div>
  );
}
