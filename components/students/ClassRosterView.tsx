'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Eye, EyeOff, KeyRound, Loader2, Users2, X } from 'lucide-react';
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
  useLazyExportSectionRosterQuery,
  useResetStudentPinMutation,
} from '@/store/api/studentsApi';
import { getErrorMessage } from '@/lib/get-error-message';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';
import { cn } from '@/lib/utils';

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
}

/**
 * Class/section roster of Login IDs + PIN status — the one place an admin or
 * teacher goes to find/reset a student's login credentials now that bulk
 * import and single-add no longer show them per-row after the fact (see
 * StudentsView.tsx / StudentFormDrawer.tsx).
 */
export function ClassRosterView({ mode }: Props) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Logins"
        description="Look up or reset a student's Login ID and PIN by class and section."
      />

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
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Login ID</TableHead>
                <TableHead>PIN status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.students.map((s) => (
                <RosterRow
                  key={s.id}
                  student={s}
                  isAdmin={isAdmin}
                  onResetPin={() => setResetTarget({ id: s.id, name: s.name, systemId: s.systemId })}
                />
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      {resetTarget && (
        <ResetPinDialog
          studentId={resetTarget.id}
          studentName={resetTarget.name}
          studentSystemId={resetTarget.systemId}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

function RosterRow({
  student, isAdmin, onResetPin,
}: {
  student: { id: string; name: string; rollNumber: string; systemId: string | null; pinState: 'school_issued' | 'student_set'; pin?: string | null };
  isAdmin: boolean;
  onResetPin: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null | 'loading'>(null);
  const [triggerGetPin] = useLazyGetStudentPinQuery();

  const onReveal = async () => {
    if (revealed && revealed !== 'loading') { setRevealed(null); return; }
    setRevealed('loading');
    try {
      const res = await triggerGetPin(student.id).unwrap();
      setRevealed(res.data.pin);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not fetch PIN'));
      setRevealed(null);
    }
  };

  // `pin` is only ever present in the roster row itself for an admin-scoped
  // call — a teacher-scoped call simply omits the field (see
  // student.service.ts's getSectionRoster()); either way, this row requires
  // an explicit "Reveal" click rather than always showing PINs, to avoid
  // shoulder-surfing.
  const canReveal = isAdmin && student.pinState === 'school_issued';

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-foreground">{student.name}</p>
        <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
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
      <TableCell className="text-right">
        <Button size="sm" variant="secondary" onClick={onResetPin}>
          <KeyRound size={14} /> Reset / Set PIN
        </Button>
      </TableCell>
    </TableRow>
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
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
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
