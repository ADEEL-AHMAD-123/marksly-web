'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2, X, Clock, MapPin } from 'lucide-react';
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

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableView() {
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteEntry] = useDeleteEntryMutation();

  const sections = useMemo(() => classes.find((c) => c.id === classId)?.sections ?? [], [classes, classId]);
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
        description="Build the weekly schedule per section."
        actions={ready ? <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add period</Button> : undefined}
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {classes.length === 0 ? (
        // Distinct from the "pick one" empty state below — an empty class
        // dropdown with the same generic "Select a class" message left an
        // admin with nothing to actually select, no explanation why.
        <Card><EmptyState icon={CalendarClock} title="No classes yet" description="Create a class first (Classes page) before building a timetable." /></Card>
      ) : !ready ? (
        <Card><EmptyState icon={CalendarClock} title="Select a class and section" description="Choose a class and section to view or build its timetable." /></Card>
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
                <p className="mb-3 text-sm font-semibold text-foreground">{day}</p>
                {periods.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No periods</p>
                ) : (
                  <ul className="space-y-2">
                    {periods.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground"><Clock size={12} /> {e.startTime}–{e.endTime}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{e.subject ?? 'Subject'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {e.teacher ?? 'Unassigned'}{e.room ? <> · <MapPin size={10} className="inline" /> {e.room}</> : null}
                          </p>
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

      <AddPeriodDrawer open={addOpen} onClose={() => setAddOpen(false)} classId={classId} sectionId={sectionId} />
    </div>
  );
}

function AddPeriodDrawer({ open, onClose, classId, sectionId }: { open: boolean; onClose: () => void; classId: string; sectionId: string }) {
  const { data: subjectsRes } = useGetSubjectsQuery();
  const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });
  const subjects = subjectsRes?.data ?? [];
  const teachers = teachersRes?.data ?? [];
  const [createEntry, { isLoading }] = useCreateEntryMutation();

  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [room, setRoom] = useState('');

  const selectCls = 'h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <select className={selectCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Teacher</Label>
              <select className={selectCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">Unassigned</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
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
