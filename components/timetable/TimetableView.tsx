'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2, X, Clock, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetSubjectsQuery } from '@/store/api/subjectsApi';
import { useGetUsersQuery } from '@/store/api/usersApi';
import {
  useGetTimetableQuery, useCreateEntryMutation, useDeleteEntryMutation,
} from '@/store/api/timetableApi';
import { useTerminology, getTerminologyForTermType } from '@/lib/terminology';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableView() {
  const terminology = useTerminology();
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  // Set when a specific day's "+" is clicked, so the drawer opens with that
  // day preselected instead of always defaulting to Monday — filling out a
  // whole week one period at a time was needlessly fiddly otherwise.
  const [addDay, setAddDay] = useState('1');
  const [deleteEntry] = useDeleteEntryMutation();

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const sections = selectedClass?.sections ?? [];
  // Once a class is actually picked, prefer its own term's wording (e.g. a
  // short-session course should say "Batch") over the institution-wide
  // default — falls back to the generic default while nothing is selected.
  const sectionLabel = getTerminologyForTermType(selectedClass?.termType)?.section ?? terminology.section;
  const ready = !!classId && !!sectionId;
  const { data, isFetching } = useGetTimetableQuery({ classId, sectionId }, { skip: !ready });
  const entries = data?.data ?? [];

  const byDay = useMemo(() => {
    const m: Record<number, typeof entries> = {};
    for (const e of entries) (m[e.dayOfWeek] ??= []).push(e);
    return m;
  }, [entries]);

  const remove = async (id: string) => {
    try { await deleteEntry(id).unwrap(); toast.success('Period removed'); }
    catch { toast.error('Could not remove'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description={`Build the weekly schedule per ${sectionLabel.toLowerCase()}.`}
        actions={ready ? <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add period</Button> : undefined}
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
      </Card>

      {classes.length === 0 ? (
        // Distinct from the "pick one" empty state below — an empty class
        // dropdown with the same generic "Select a class" message left an
        // admin with nothing to actually select, no explanation why.
        <Card><EmptyState icon={CalendarClock} title={`No ${terminology.classUnitPlural.toLowerCase()} yet`} description={`Create a ${terminology.classUnit.toLowerCase()} first (${terminology.classUnitPlural} page) before building a timetable.`} /></Card>
      ) : !ready ? (
        <Card><EmptyState icon={CalendarClock} title={`Select a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()}`} description={`Choose a ${terminology.classUnit.toLowerCase()} and ${sectionLabel.toLowerCase()} to view or build its timetable.`} /></Card>
      ) : isFetching && entries.length === 0 ? (
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {DAYS.map((day, idx) => {
            const periods = byDay[idx] ?? [];
            if (idx === 0 || idx === 6) {
              if (periods.length === 0) return null; // hide empty weekend by default
            }
            return (
              <Card key={day} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{day}</p>
                  <button
                    type="button"
                    onClick={() => { setAddDay(String(idx)); setAddOpen(true); }}
                    aria-label={`Add period on ${day}`}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {periods.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No periods</p>
                ) : (
                  <ul className="space-y-2">
                    {periods.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground"><Clock size={12} /> {e.startTime}–{e.endTime}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{e.subject ?? 'No subject'}</p>
                          {e.teacher ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {e.teacher}{e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                            </p>
                          ) : (
                            // Flagged in warning color (not muted like everything
                            // else here) — this is the one state an admin should
                            // actually notice and act on, not skim past.
                            <p className="flex items-center gap-1 truncate text-xs text-warning">
                              <AlertTriangle size={11} className="shrink-0" /> No teacher assigned
                              {e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                            </p>
                          )}
                        </div>
                        <button onClick={() => remove(e.id)} aria-label="Remove period" className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"><Trash2 size={15} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AddPeriodDrawer open={addOpen} onClose={() => setAddOpen(false)} classId={classId} sectionId={sectionId} initialDay={addDay} />
    </div>
  );
}

function AddPeriodDrawer({ open, onClose, classId, sectionId, initialDay }: { open: boolean; onClose: () => void; classId: string; sectionId: string; initialDay: string }) {
  const { data: subjectsRes } = useGetSubjectsQuery();
  const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });
  const allSubjects = subjectsRes?.data ?? [];
  // Subjects are class-scoped (the same subject NAME can exist as separate
  // records for different classes — "Mathematics" for Grade 8 and
  // "Mathematics" for Grade 9 are different Subject documents). Without
  // this filter, every subject in the institution showed up here regardless
  // of which class's timetable was being edited, so an admin could
  // accidentally attach a completely unrelated class's subject to this
  // slot — both looked identical as plain "Mathematics" in the dropdown.
  const subjects = useMemo(() => allSubjects.filter((s) => s.classId === classId), [allSubjects, classId]);
  const teachers = teachersRes?.data ?? [];
  const [createEntry, { isLoading }] = useCreateEntryMutation();

  const [dayOfWeek, setDayOfWeek] = useState(initialDay);
  // Re-sync whenever the drawer is (re)opened via a specific day's "+" —
  // the component instance stays mounted between opens, so without this the
  // dropdown would keep showing whatever day was picked last time.
  useEffect(() => {
    if (open) setDayOfWeek(initialDay);
  }, [open, initialDay]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [room, setRoom] = useState('');

  const selectCls = 'h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Same rule the backend enforces (see timetable.service.ts) — checked
    // here too so the user sees it instantly instead of after a round trip.
    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }
    try {
      await createEntry({
        classId, sectionId, dayOfWeek: Number(dayOfWeek), startTime, endTime,
        subjectId: subjectId || undefined, teacherId: teacherId || undefined, room: room || undefined,
      }).unwrap();
      toast.success('Period added');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Could not add period');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[420px]">
        <form onSubmit={submit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Add Period</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label>Day</Label>
              <select className={selectCls} value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start">Start</Label>
                <input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={selectCls} />
              </div>
              <div>
                <Label htmlFor="end">End</Label>
                <input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={selectCls} />
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <select
                className={selectCls}
                value={subjectId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSubjectId(id);
                  // Pick up whichever teacher is actually assigned to teach
                  // THIS subject to THIS section (per-section override if
                  // one exists, else the subject's fallback teacher) —
                  // otherwise it's easy to leave a period with a different
                  // teacher than the one Subjects says teaches it, and
                  // nothing else in the app would catch that mismatch.
                  const subj = subjects.find((s) => s.id === id);
                  const covered = subj?.sectionCoverage.find((r) => r.sectionId === sectionId);
                  const resolved = covered?.teacherId ?? subj?.teacherId;
                  if (resolved) setTeacherId(resolved);
                }}
              >
                <option value="">No subject (free period / break)</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} — ${s.name}` : s.name}</option>)}
              </select>
              {subjects.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No subjects are set up for this class yet — add some from the Subjects page first.
                </p>
              )}
            </div>
            <div>
              <Label>Teacher</Label>
              <select className={selectCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">No teacher assigned</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {/* A period with no teacher never shows up on ANYONE's
                  "teaching now"/timetable view — it's filtered strictly by
                  teacherId, not just displayed as blank — so leaving this
                  unassigned is easy to do by accident (it's the default
                  state) and easy to miss, since nothing else flags it. */}
              {!teacherId && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-warning">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  No teacher will see this period on their own schedule until one is assigned here.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="room">Room (optional)</Label>
              <Input id="room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room 12" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Add period</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
