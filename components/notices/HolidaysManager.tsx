'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  CalendarOff, Plus, Trash2, X, Pencil, Info, AlertTriangle, ListPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetClassesQuery } from '@/store/api/classesApi';
import {
  useGetHolidaysQuery, useCreateHolidayMutation, useCreateHolidaysBulkMutation,
  useUpdateHolidayMutation, useDeleteHolidayMutation, useLazyCheckHolidayOverlapQuery,
  type Holiday, type CreateHolidayBody,
} from '@/store/api/holidaysApi';

const AUDIENCE_LABEL: Record<Holiday['audience'], string> = {
  everyone: 'Everyone (school closed)',
  students: 'Students only (staff still in)',
  staff: 'Staff only (students still in)',
};

const AUDIENCE_BADGE: Record<Holiday['audience'], 'primary' | 'warning' | 'neutral'> = {
  everyone: 'primary',
  students: 'warning',
  staff: 'neutral',
};

const MONTH_LABEL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The Notices page's own holiday manager. Holidays used to be tucked
 * inside the Timetable page (a date-level closure has nothing to do with
 * the weekly schedule grid there -- that was always just where the UI
 * happened to live). They belong here instead: a holiday is fundamentally
 * a calendar announcement to the whole school -- it's WHY it already
 * auto-posts a Notice on creation (see marksly-api's holiday.service.ts) --
 * so managing it should sit next to every other announcement, not be
 * buried behind a button on an unrelated grid.
 */
export function HolidaysManager() {
  const { data, isFetching } = useGetHolidaysQuery({});
  const holidays = useMemo(() => (data?.data ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)), [data]);
  const [deleteHoliday, { isLoading: removing }] = useDeleteHolidayMutation();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [showPast, setShowPast] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= todayStr);
  const past = holidays.filter((h) => h.date < todayStr);
  const visible = showPast ? holidays : upcoming;

  // Grouped by calendar month rather than one long flat list -- a school
  // year's worth of holidays read a lot more like an actual calendar this
  // way, and it's immediately obvious which month is thin vs. packed.
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: Holiday[] }[] = [];
    for (const h of visible) {
      const key = h.date.slice(0, 7);
      let g = groups.find((x) => x.key === key);
      if (!g) {
        const [y, m] = key.split('-');
        g = { key, label: `${MONTH_LABEL[Number(m) - 1]} ${y}`, items: [] };
        groups.push(g);
      }
      g.items.push(h);
    }
    return groups;
  }, [visible]);

  const remove = async (id: string) => {
    try { await deleteHoliday(id).unwrap(); toast.success('Holiday removed'); setConfirmingId(null); }
    catch (err: any) { toast.error(err?.data?.error?.message || 'Could not remove holiday'); }
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (h: Holiday) => { setEditing(h); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary-soft px-3.5 py-3">
        <CalendarOff size={16} className="mt-0.5 shrink-0 text-primary-soft-foreground" />
        <p className="text-sm text-foreground">
          Marks specific dates as closed -- a public holiday, a weather closure, one class&apos;s field trip. It
          doesn&apos;t change the weekly timetable at all; it just stops attendance being taken on that date, and
          posts an announcement to whoever it affects, automatically.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{holidays.length === 0 ? 'No holidays yet' : `${upcoming.length} upcoming, ${past.length} past`}</h3>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> Add holiday</Button>
      </div>

      {isFetching ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : holidays.length === 0 ? (
        <Card><EmptyState icon={CalendarOff} title="No holidays yet" description="Add a public holiday, closure, or class trip." /></Card>
      ) : visible.length === 0 ? (
        <Card className="p-5"><p className="text-sm text-muted-foreground">No upcoming holidays. All {past.length} added so far are in the past.</p></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.key}>
              <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
              <div className="space-y-1.5">
                {g.items.map((h) => (
                  <Card key={h.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{h.date} -- {h.reason}</p>
                        <Badge variant={AUDIENCE_BADGE[h.audience]}>{h.audience === 'everyone' ? 'Everyone' : h.audience === 'students' ? 'Students' : 'Staff'}</Badge>
                        {h.scope === 'class' && <Badge variant="neutral">{h.className ?? 'Class'}{h.section ? ` -- ${h.section}` : ''}</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {h.scope === 'institution' ? 'Whole institution' : 'One class only'} &middot; {AUDIENCE_LABEL[h.audience]}
                      </p>
                    </div>
                    {confirmingId === h.id ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-muted-foreground">Remove?</span>
                        <Button type="button" size="sm" variant="danger" loading={removing} onClick={() => remove(h.id)}>Yes</Button>
                        <Button type="button" size="sm" variant="ghost" disabled={removing} onClick={() => setConfirmingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Edit this holiday"
                          aria-label="Edit this holiday"
                          onClick={() => openEdit(h)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Remove this holiday"
                          aria-label="Remove this holiday"
                          onClick={() => setConfirmingId(h.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showPast && past.length > 0 && (
        <button type="button" onClick={() => setShowPast(true)} className="w-full rounded-md py-1.5 text-center text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          Show {past.length} past holiday{past.length === 1 ? '' : 's'}
        </button>
      )}
      {showPast && past.length > 0 && (
        <button type="button" onClick={() => setShowPast(false)} className="w-full rounded-md py-1.5 text-center text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          Hide past holidays
        </button>
      )}

      {formOpen && <HolidayFormDialog open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />}
    </div>
  );
}

type DraftRow = { date: string; reason: string };

/**
 * One dialog handles both adding a single holiday and adding several at
 * once (a term's public-holiday list, say) -- "Add multiple" just swaps the
 * single date+reason pair for a repeatable list of them, sharing the same
 * scope/audience for the whole batch, since in practice every holiday in
 * one paste is almost always the same kind of closure. Editing an existing
 * holiday reuses the exact same single-row form, pre-filled, submitting a
 * PATCH instead of a POST -- no more delete-then-recreate to fix a typo.
 */
function HolidayFormDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Holiday | null }) {
  const { data: classesData } = useGetClassesQuery();
  const classes = classesData?.data ?? [];
  const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
  const [createBulk, { isLoading: creatingBulk }] = useCreateHolidaysBulkMutation();
  const [updateHoliday, { isLoading: updating }] = useUpdateHolidayMutation();
  const [checkOverlap] = useLazyCheckHolidayOverlapQuery();

  const [bulkMode, setBulkMode] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([{ date: '', reason: '' }]);
  const [scope, setScope] = useState<'institution' | 'class'>('institution');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [audience, setAudience] = useState<Holiday['audience']>('everyone');
  const [overlap, setOverlap] = useState<{ date: string; text: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ createdCount: number; skipped: { date: string; reason: string }[] } | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass?.sections ?? [];

  useEffect(() => {
    if (!open) return;
    setBulkResult(null);
    if (editing) {
      setBulkMode(false);
      setRows([{ date: editing.date, reason: editing.reason }]);
      setScope(editing.scope);
      setClassId(editing.classId ?? '');
      setSectionId(editing.sectionId ?? '');
      setAudience(editing.audience);
    } else {
      setBulkMode(false);
      setRows([{ date: '', reason: '' }]);
      setScope('institution');
      setClassId('');
      setSectionId('');
      setAudience('everyone');
    }
    setOverlap(null);
  }, [open, editing]);

  // Fires as soon as there's a real date to check against -- a soft,
  // non-blocking "are you sure" (a real duplicate closure is still hard-
  // blocked by the backend on submit). Only meaningful for the single-row
  // form; bulk-added rows are checked individually after they land instead
  // (see submit()'s skipped-row reporting).
  useEffect(() => {
    if (bulkMode || editing) return;
    const date = rows[0]?.date;
    if (!date) { setOverlap(null); return; }
    const args = scope === 'class' && classId && sectionId ? { date, classId, sectionId } : { date };
    const t = setTimeout(async () => {
      try {
        const res = await checkOverlap(args).unwrap();
        const { exams, holidays: existing } = res.data;
        const parts: string[] = [];
        if (existing.length > 0) parts.push(`already marked off (${existing[0].reason})`);
        if (exams.length > 0) parts.push(`${exams.length} exam${exams.length === 1 ? '' : 's'} scheduled that day (${exams.map((e) => e.title).join(', ')})`);
        setOverlap(parts.length > 0 ? { date, text: parts.join(' + ') } : null);
      } catch { /* a failed check is just silence, never a blocker */ }
    }, 400);
    return () => clearTimeout(t);
  }, [rows, scope, classId, sectionId, bulkMode, editing, checkOverlap]);

  const addRow = () => setRows((prev) => [...prev, { date: '', reason: '' }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<DraftRow>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const toBody = (row: DraftRow): CreateHolidayBody => ({
    date: row.date,
    reason: row.reason.trim(),
    scope,
    audience,
    ...(scope === 'class' ? { classId, sectionId } : {}),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scope === 'class' && (!classId || !sectionId)) { toast.error('Pick a class and section'); return; }
    const validRows = rows.filter((r) => r.date && r.reason.trim());
    if (validRows.length === 0) { toast.error('Add at least one date and reason'); return; }

    try {
      if (editing) {
        await updateHoliday({ id: editing.id, ...toBody(validRows[0]) }).unwrap();
        toast.success('Holiday updated');
        onClose();
      } else if (bulkMode && validRows.length > 1) {
        const res = await createBulk({ holidays: validRows.map(toBody) }).unwrap();
        setBulkResult({ createdCount: res.data.created.length, skipped: res.data.skipped });
        if (res.data.skipped.length === 0) { toast.success(`${res.data.created.length} holidays added`); onClose(); }
      } else {
        await createHoliday(toBody(validRows[0])).unwrap();
        toast.success('Holiday added');
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Could not save holiday');
    }
  };

  const saving = creating || creatingBulk || updating;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                <CalendarOff size={16} />
              </span>
              <DialogPrimitive.Title className="text-base font-semibold">{editing ? 'Edit holiday' : 'Add holiday'}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></DialogPrimitive.Close>
          </div>

          <form onSubmit={submit} className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {!editing && (
              <button
                type="button"
                onClick={() => { setBulkMode((v) => !v); setRows([{ date: '', reason: '' }]); }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ListPlus size={13} /> {bulkMode ? 'Switch to a single date' : 'Add several dates at once'}
              </button>
            )}

            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                  <Input type="date" value={row.date} onChange={(e) => updateRow(i, { date: e.target.value })} required />
                  <Input
                    value={row.reason}
                    onChange={(e) => updateRow(i, { reason: e.target.value })}
                    placeholder="e.g. Public Holiday"
                    maxLength={200}
                    required
                  />
                  {bulkMode && rows.length > 1 ? (
                    <button type="button" onClick={() => removeRow(i)} className="rounded-md p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
            {bulkMode && (
              <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Plus size={13} /> Add another date
              </button>
            )}

            {overlap && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <p>{overlap.date} is {overlap.text}. You can still save -- just double-check that&apos;s what you meant.</p>
              </div>
            )}

            <div>
              <Label>Applies to</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('institution')}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${scope === 'institution' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border hover:bg-muted'}`}
                >
                  Whole institution
                </button>
                <button
                  type="button"
                  onClick={() => setScope('class')}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${scope === 'class' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border hover:bg-muted'}`}
                >
                  Just one class
                </button>
              </div>
            </div>

            {scope === 'class' && (
              <div className="grid grid-cols-2 gap-3">
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
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="holiday-audience">Who&apos;s off</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Holiday['audience'])}>
                <SelectTrigger id="holiday-audience"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(AUDIENCE_LABEL) as Holiday['audience'][]).map((a) => (
                    <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary-soft/25 px-3 py-2.5 text-xs text-primary-soft-foreground">
              <Info size={13} className="mt-0.5 shrink-0" />
              <p>
                {audience === 'staff' ? (
                  <>Attendance isn&apos;t affected -- students stay markable as normal. No notice is sent for a single class&apos;s staff-only day, since staff aren&apos;t tied to one class.</>
                ) : (
                  <>
                    Attendance can&apos;t be taken for {scope === 'institution' ? 'any class' : 'the selected class'} on {rows.length > 1 ? 'these dates' : 'this date'}, and a
                    notice goes out automatically to {audience === 'everyone' ? 'everyone' : 'students, parents, and teachers'}{scope === 'class' ? " -- just this class's own" : ''}.
                  </>
                )}
              </p>
            </div>

            {bulkResult && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p className="font-medium text-foreground">{bulkResult.createdCount} added{bulkResult.skipped.length > 0 ? `, ${bulkResult.skipped.length} skipped` : ''}</p>
                {bulkResult.skipped.map((s, i) => (
                  <p key={i} className="mt-1 text-muted-foreground">{s.date}: {s.reason}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" loading={saving}>{editing ? 'Save changes' : bulkMode ? 'Add holidays' : 'Add holiday'}</Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
