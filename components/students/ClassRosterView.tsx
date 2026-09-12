'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, KeyRound, Loader2, Users2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { TempPasswordDialog } from '@/components/ui/temp-password-dialog';
import { Input } from '@/components/ui/input';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useMyClassesQuery } from '@/store/api/portalApi';
import {
  useGetSectionRosterQuery,
  useLazyGetStudentPinQuery,
  useLazyGetGuardianPinQuery,
  useLazyExportSectionRosterQuery,
  useResetStudentPinMutation,
  useResetGuardianPinMutation,
} from '@/store/api/studentsApi';
import { getErrorMessage } from '@/lib/get-error-message';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';
import { cn, getInitials } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
  termType?: string | null;
}

interface Props {
  /** Admin sees every class/section, a "Reveal PIN" button, and CSV export.
   *  Teacher only sees their own assigned sections (via useMyClassesQuery)
   *  and can reset/set a PIN but never view the current one — the backend
   *  simply omits the `pin` field for a teacher-scoped roster call. */
  mode: 'admin' | 'teacher';
  /** True when rendered inside the "Login IDs & PINs" page's Students tab
   *  (see LoginIdsView.tsx) instead of its own standalone page — hides the
   *  page-level header since the parent page already has its own title. */
  embedded?: boolean;
}

/**
 * Class/section roster of Login IDs + PIN status — the one place an admin or
 * teacher goes to find/reset a student's login credentials now that bulk
 * import and single-add no longer show them per-row after the fact (see
 * StudentsView.tsx / StudentFormDrawer.tsx).
 */
export function ClassRosterView({ mode, embedded }: Props) {
  const terminology = useTerminology();
  const isAdmin = mode === 'admin';
  const { data: classesRes } = useGetClassesQuery(undefined, { skip: !isAdmin });
  const { data: myClassesRes } = useMyClassesQuery(undefined, { skip: isAdmin });
  const classes: ClassOption[] = useMemo(
    () => (isAdmin ? classesRes?.data ?? [] : myClassesRes?.data ?? []),
    [isAdmin, classesRes, myClassesRes]
  );

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? terminology.section;
  const ready = !!classId && !!sectionId;

  const { data, isFetching, isError, error, refetch } = useGetSectionRosterQuery(
    { classId, sectionId },
    { skip: !ready }
  );
  const roster = data?.data;

  // The section roster is fetched in one shot (a section is bounded — even
  // a large one rarely exceeds a hundred students, so there's no need for
  // server-side paging), but a class of 40-50 students rendered as one long
  // table/card list was still unwieldy to scan — paginate client-side
  // instead. Resets to page 1 whenever the selected section (or its
  // student count) changes, so switching sections never leaves you
  // stranded on a page number that no longer has any rows.
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const students = roster?.students ?? [];
  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pagedStudents = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [classId, sectionId]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const [exportRoster, { isFetching: exporting }] = useLazyExportSectionRosterQuery();
  const onExport = async () => {
    try {
      const blob = await exportRoster({ classId, sectionId }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster-${roster?.className ?? 'class'}-${roster?.section ?? 'section'}.csv`.replace(/\s+/g, '-');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not export roster'));
    }
  };

  // A 403 here means a teacher followed a stale link to a section they're no
  // longer (or never were) assigned to teach — enforced server-side in
  // student.service.ts's getSectionRoster().
  const forbidden = isError && (error as any)?.status === 403;

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; systemId: string | null } | null>(null);
  const [resetGuardianTarget, setResetGuardianTarget] = useState<{ studentId: string; guardianId: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Student Logins"
          description="Look up or reset a student's Login ID and PIN by class and section."
        />
      )}

      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label>{terminology.classUnit}</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
              <SelectTrigger><SelectValue placeholder={`Select ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{sectionLabel}</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder={sectionLabel} /></SelectTrigger>
              <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="flex items-end">
              <Button
                variant="secondary"
                size="sm"
                disabled={!ready || !roster || roster.students.length === 0 || exporting}
                loading={exporting}
                onClick={onExport}
                title={
                  !ready
                    ? `Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()} first`
                    : roster && roster.students.length === 0
                    ? 'No students in this section to export'
                    : undefined
                }
              >
                <Download size={15} /> Export CSV
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!ready ? (
        <Card><EmptyState icon={Users2} title={`Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()}`} description="Then view every student's Login ID and PIN status." /></Card>
      ) : forbidden ? (
        <Card><EmptyState icon={Users2} title="Not your section" description="You can only view student logins for a section you're the assigned teacher of." /></Card>
      ) : isError ? (
        <Card><EmptyState icon={Users2} title="Couldn't load student logins" description="There was a problem reaching the server." action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>} /></Card>
      ) : isFetching || !roster ? (
        <Card className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      ) : roster.students.length === 0 ? (
        <Card><EmptyState icon={Users2} title="No active students in this section" description="Add students to this class/section first." /></Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Login ID</TableHead>
                    <TableHead>Student PIN</TableHead>
                    {isAdmin && (
                      <>
                        <TableHead>Guardian</TableHead>
                        <TableHead>Guardian PIN</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedStudents.map((s) => (
                    <RosterRow
                      key={s.id}
                      student={s}
                      isAdmin={isAdmin}
                      onResetPin={() => setResetTarget({ id: s.id, name: s.name, systemId: s.systemId })}
                      onResetGuardianPin={
                        s.guardianId
                          ? () => setResetGuardianTarget({ studentId: s.id, guardianId: s.guardianId!, name: s.guardianName || 'Parent' })
                          : undefined
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          {/* Mobile cards — the 5-column admin table has no reasonable
              small-screen equivalent, so this is a full card layout rather
              than a squeezed table, matching StudentsView.tsx's own
              desktop-table/mobile-card split. */}
          <div className="space-y-3 md:hidden">
            {pagedStudents.map((s) => (
              <RosterCard
                key={s.id}
                student={s}
                isAdmin={isAdmin}
                onResetPin={() => setResetTarget({ id: s.id, name: s.name, systemId: s.systemId })}
                onResetGuardianPin={
                  s.guardianId
                    ? () => setResetGuardianTarget({ studentId: s.id, guardianId: s.guardianId!, name: s.guardianName || 'Parent' })
                    : undefined
                }
              />
            ))}
          </div>

          {/* Pagination — same pattern as StudentsView.tsx's own list. */}
          {students.length > PAGE_SIZE && (
            <Card className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
                <span className="ml-1.5">· {students.length} student{students.length === 1 ? '' : 's'}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {resetTarget && (
        <ResetPinDialog
          studentId={resetTarget.id}
          studentName={resetTarget.name}
          studentSystemId={resetTarget.systemId}
          onClose={() => setResetTarget(null)}
        />
      )}

      {resetGuardianTarget && (
        <ResetGuardianPinDialog
          studentId={resetGuardianTarget.studentId}
          guardianId={resetGuardianTarget.guardianId}
          guardianName={resetGuardianTarget.name}
          onClose={() => setResetGuardianTarget(null)}
        />
      )}
    </div>
  );
}

type RosterStudent = {
  id: string; name: string; rollNumber: string; profilePhoto?: string | null; systemId: string | null;
  pinState: 'school_issued' | 'student_set'; pin?: string | null;
  guardianId?: string | null; guardianName?: string | null; guardianPhone?: string | null;
  guardianPinState?: 'school_issued' | 'guardian_set' | null;
};

/** Reveal-on-demand state for a student's own PIN — shared between the
 *  desktop row and mobile card so the interaction (and its loading/error
 *  handling) stays identical in both. */
function useStudentPinReveal(studentId: string) {
  const [revealed, setRevealed] = useState<string | null | 'loading'>(null);
  const [triggerGetPin] = useLazyGetStudentPinQuery();
  const onReveal = async () => {
    if (revealed && revealed !== 'loading') { setRevealed(null); return; }
    setRevealed('loading');
    try {
      const res = await triggerGetPin(studentId).unwrap();
      setRevealed(res.data.pin);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not fetch PIN'));
      setRevealed(null);
    }
  };
  return { revealed, onReveal };
}

/** Same reveal-on-demand pattern, for the guardian's PIN. */
function useGuardianPinReveal(studentId: string) {
  const [revealed, setRevealed] = useState<string | null | 'loading'>(null);
  const [triggerGetGuardianPin] = useLazyGetGuardianPinQuery();
  const onReveal = async () => {
    if (revealed && revealed !== 'loading') { setRevealed(null); return; }
    setRevealed('loading');
    try {
      const res = await triggerGetGuardianPin({ id: studentId }).unwrap();
      setRevealed(res.data.pin);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not fetch PIN'));
      setRevealed(null);
    }
  };
  return { revealed, onReveal };
}

function RosterRow({
  student, isAdmin, onResetPin, onResetGuardianPin,
}: {
  student: RosterStudent;
  isAdmin: boolean;
  onResetPin: () => void;
  onResetGuardianPin?: () => void;
}) {
  const { revealed, onReveal } = useStudentPinReveal(student.id);
  const { revealed: revealedGuardianPin, onReveal: onRevealGuardian } = useGuardianPinReveal(student.id);
  const canRevealGuardian = isAdmin && !!student.guardianId && (student.guardianPinState ?? 'school_issued') === 'school_issued';

  // `pin` is only ever present in the roster row itself for an admin-scoped
  // call — a teacher-scoped call simply omits the field (see
  // student.service.ts's getSectionRoster()); either way, this row requires
  // an explicit "Reveal" click rather than always showing PINs, to avoid
  // shoulder-surfing.
  const canReveal = isAdmin && student.pinState === 'school_issued';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar
            photoUrl={student.profilePhoto}
            alt={student.name}
            initials={getInitials(student.name.split(' ')[0] || '', student.name.split(' ')[1] || '')}
            size="sm"
          />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
          </div>
        </div>
      </TableCell>
      <TableCell dir="ltr" className="font-mono text-sm">{student.systemId ?? '—'}</TableCell>
      <TableCell>
        {student.pinState === 'student_set' ? (
          <Badge variant="neutral">Student-set (not viewable)</Badge>
        ) : canReveal ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onReveal}>
              {revealed === 'loading' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : revealed ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
              {revealed && revealed !== 'loading' ? 'Hide' : 'Reveal'}
            </Button>
            {revealed && revealed !== 'loading' && (
              <span dir="ltr" className="font-mono font-semibold tracking-wide">{revealed}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not viewable</span>
        )}
      </TableCell>
      {isAdmin && (
        <>
          <TableCell>
            {!student.guardianId ? (
              <span className="text-sm text-muted-foreground">No guardian</span>
            ) : (
              <div>
                <p className="text-sm text-foreground">{student.guardianName || '—'}</p>
                {student.guardianPhone && <p dir="ltr" className="text-xs text-muted-foreground">{student.guardianPhone}</p>}
              </div>
            )}
          </TableCell>
          <TableCell>
            {!student.guardianId ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : student.guardianPinState === 'guardian_set' ? (
              <Badge variant="neutral">Self-set (not viewable)</Badge>
            ) : canRevealGuardian ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onRevealGuardian}>
                  {revealedGuardianPin === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : revealedGuardianPin ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                  {revealedGuardianPin && revealedGuardianPin !== 'loading' ? 'Hide' : 'Reveal'}
                </Button>
                {revealedGuardianPin && revealedGuardianPin !== 'loading' && (
                  <span dir="ltr" className="font-mono font-semibold tracking-wide">{revealedGuardianPin}</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Not viewable</span>
            )}
          </TableCell>
        </>
      )}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onResetPin}>
            <KeyRound size={14} /> Reset student PIN
          </Button>
          {onResetGuardianPin && (
            <Button size="sm" variant="secondary" onClick={onResetGuardianPin}>
              <KeyRound size={14} /> Reset guardian PIN
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Mobile equivalent of RosterRow — a self-contained card instead of a table
 *  row, since the admin view's 5 columns have no reasonable squeezed-table
 *  form on a phone-width screen. */
function RosterCard({
  student, isAdmin, onResetPin, onResetGuardianPin,
}: {
  student: RosterStudent;
  isAdmin: boolean;
  onResetPin: () => void;
  onResetGuardianPin?: () => void;
}) {
  const { revealed, onReveal } = useStudentPinReveal(student.id);
  const { revealed: revealedGuardianPin, onReveal: onRevealGuardian } = useGuardianPinReveal(student.id);
  const canRevealGuardian = isAdmin && !!student.guardianId && (student.guardianPinState ?? 'school_issued') === 'school_issued';
  const canReveal = isAdmin && student.pinState === 'school_issued';

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        <Avatar
          photoUrl={student.profilePhoto}
          alt={student.name}
          initials={getInitials(student.name.split(' ')[0] || '', student.name.split(' ')[1] || '')}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{student.name}</p>
          <p className="text-xs text-muted-foreground">
            Roll: {student.rollNumber}
            {student.systemId && <span dir="ltr" className="ml-1 font-mono">· {student.systemId}</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Student PIN</span>
          {student.pinState === 'student_set' ? (
            <Badge variant="neutral">Student-set</Badge>
          ) : canReveal ? (
            <div className="flex items-center gap-2">
              {revealed && revealed !== 'loading' && (
                <span dir="ltr" className="font-mono font-semibold tracking-wide">{revealed}</span>
              )}
              <Button size="sm" variant="ghost" onClick={onReveal}>
                {revealed === 'loading' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : revealed ? (
                  <EyeOff size={14} />
                ) : (
                  <Eye size={14} />
                )}
                {revealed && revealed !== 'loading' ? 'Hide' : 'Reveal'}
              </Button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Not viewable</span>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Guardian</span>
              {student.guardianId ? (
                <>
                  <p className="truncate text-sm text-foreground">{student.guardianName || '—'}</p>
                  {student.guardianPhone && <p dir="ltr" className="text-xs text-muted-foreground">{student.guardianPhone}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
            {student.guardianId && (
              student.guardianPinState === 'guardian_set' ? (
                <Badge variant="neutral">Self-set</Badge>
              ) : canRevealGuardian ? (
                <div className="flex shrink-0 items-center gap-2">
                  {revealedGuardianPin && revealedGuardianPin !== 'loading' && (
                    <span dir="ltr" className="font-mono text-sm font-semibold tracking-wide">{revealedGuardianPin}</span>
                  )}
                  <Button size="sm" variant="ghost" onClick={onRevealGuardian}>
                    {revealedGuardianPin === 'loading' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : revealedGuardianPin ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                    {revealedGuardianPin && revealedGuardianPin !== 'loading' ? 'Hide' : 'Reveal'}
                  </Button>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button size="sm" variant="secondary" onClick={onResetPin}>
          <KeyRound size={14} /> Reset student PIN
        </Button>
        {onResetGuardianPin && (
          <Button size="sm" variant="secondary" onClick={onResetGuardianPin}>
            <KeyRound size={14} /> Reset guardian PIN
          </Button>
        )}
      </div>
    </Card>
  );
}

function ResetPinDialog({
  studentId, studentName, studentSystemId, onClose,
}: {
  studentId: string;
  studentName: string;
  studentSystemId: string | null;
  onClose: () => void;
}) {
  const [resetPin, { isLoading }] = useResetStudentPinMutation();
  const [mode, setMode] = useState<'random' | 'custom'>('random');
  const [customPin, setCustomPin] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const validCustom = mode === 'random' || (customPin.length >= 4 && customPin.length <= 6);

  const onSubmit = async () => {
    try {
      const res = await resetPin({ id: studentId, pin: mode === 'custom' ? customPin : undefined }).unwrap();
      setResult(res.data.pin);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not reset PIN'));
    }
  };

  if (result) {
    return (
      <TempPasswordDialog
        open
        onClose={onClose}
        name={studentName}
        systemId={studentSystemId ?? ''}
        pin={result}
      />
    );
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">Reset PIN — {studentName}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('random')}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', mode === 'random' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground')}
              >
                Random PIN
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', mode === 'custom' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground')}
              >
                Custom PIN
              </button>
            </div>
            {mode === 'custom' && (
              <div>
                <Label htmlFor="custom-pin">New PIN (4-6 digits)</Label>
                <Input
                  id="custom-pin"
                  dir="ltr"
                  inputMode="numeric"
                  value={customPin}
                  onChange={(e) => setCustomPin(digitsOnly(e.target.value))}
                  placeholder="e.g. 1234"
                />
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!validCustom || isLoading} loading={isLoading} onClick={onSubmit}>
              Reset PIN
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Same shape as ResetPinDialog above, for a guardian instead of the student
 *  themselves — see student.service.ts's resetGuardianPin(). A guardian can
 *  be linked to more than one child (siblings), so this always warns via
 *  siblingCount once the reset actually happens, since the admin may not
 *  realize this same guardian is shared. */
function ResetGuardianPinDialog({
  studentId, guardianId, guardianName, onClose,
}: {
  studentId: string;
  guardianId: string;
  guardianName: string;
  onClose: () => void;
}) {
  const [resetGuardianPin, { isLoading }] = useResetGuardianPinMutation();
  const [mode, setMode] = useState<'random' | 'custom'>('random');
  const [customPin, setCustomPin] = useState('');
  const [result, setResult] = useState<{ pin: string; siblingCount: number } | null>(null);

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const validCustom = mode === 'random' || (customPin.length >= 4 && customPin.length <= 6);

  const onSubmit = async () => {
    try {
      const res = await resetGuardianPin({
        id: studentId,
        guardianUserId: guardianId,
        customPin: mode === 'custom' ? customPin : undefined,
      }).unwrap();
      setResult({ pin: res.data.pin, siblingCount: res.data.siblingCount });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not reset PIN'));
    }
  };

  if (result) {
    return (
      <TempPasswordDialog
        open
        onClose={onClose}
        name={guardianName}
        pin={result.pin}
        roleLabel={result.siblingCount > 0 ? `Parent — also affects ${result.siblingCount} other linked ${result.siblingCount === 1 ? 'child' : 'children'}` : 'Parent'}
      />
    );
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-base font-semibold">Reset guardian PIN — {guardianName}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('random')}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', mode === 'random' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground')}
              >
                Random PIN
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', mode === 'custom' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground')}
              >
                Custom PIN
              </button>
            </div>
            {mode === 'custom' && (
              <div>
                <Label htmlFor="custom-guardian-pin">New PIN (4-6 digits)</Label>
                <Input
                  id="custom-guardian-pin"
                  dir="ltr"
                  inputMode="numeric"
                  value={customPin}
                  onChange={(e) => setCustomPin(digitsOnly(e.target.value))}
                  placeholder="e.g. 1234"
                />
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!validCustom || isLoading} loading={isLoading} onClick={onSubmit}>
              Reset PIN
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
