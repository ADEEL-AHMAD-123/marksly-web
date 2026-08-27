'use client';

import { useState } from 'react';
import { CalendarRange, Plus, Check, ArrowRight, X, GraduationCap, AlertTriangle, Undo2, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import {
  useGetAcademicYearsQuery,
  useCreateAcademicYearMutation,
  useActivateAcademicYearMutation,
  usePreviewPromotionMutation,
  usePromoteStudentsMutation,
  useUndoPromotionMutation,
  type PromotionPreview,
} from '@/store/api/academicYearsApi';
import { useGetClassesQuery, type ClassItem } from '@/store/api/classesApi';
import { getErrorMessage } from '@/lib/get-error-message';

export function AcademicYearView() {
  const { data, isLoading } = useGetAcademicYearsQuery();
  const years = data?.data ?? [];
  const [activate] = useActivateAcademicYearMutation();
  const [addOpen, setAddOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  // Kept here (not inside PromoteDrawer) specifically so the Undo option
  // survives the drawer closing — a promotion just happened and the admin
  // needs a moment to realize something's wrong (e.g. the wrong section
  // pair) after they've already dismissed the sheet.
  const [lastBatch, setLastBatch] = useState<{ batchId: string; moved: number; graduated: number } | null>(null);
  const [undoPromotion, { isLoading: undoing }] = useUndoPromotionMutation();

  const setActive = async (id: string) => {
    try { await activate(id).unwrap(); toast.success('Academic year activated'); }
    catch (e: any) { toast.error(e?.data?.error?.message || 'Could not activate'); }
  };

  const handleUndo = async () => {
    if (!lastBatch) return;
    try {
      const res = await undoPromotion(lastBatch.batchId).unwrap();
      toast.success(`Reverted ${res.data.reverted} student(s)${res.data.skipped ? ` — ${res.data.skipped} could not be reverted (already changed since)` : ''}`);
      setLastBatch(null);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not undo promotion'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Year"
        description="Manage school years and promote students between them."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPromoteOpen(true)}><GraduationCap size={16} /> Promote students</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add year</Button>
          </>
        }
      />

      {lastBatch && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary-soft-foreground">
          <span>
            <strong>{lastBatch.moved}</strong> promoted, <strong>{lastBatch.graduated}</strong> graduated just now.
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" loading={undoing} onClick={handleUndo}><Undo2 size={14} /> Undo</Button>
            <button onClick={() => setLastBatch(null)} className="text-primary-soft-foreground/70 hover:text-primary-soft-foreground"><X size={16} /></button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Card className="p-5"><Skeleton className="h-32 w-full" /></Card>
      ) : years.length === 0 ? (
        <Card><EmptyState icon={CalendarRange} title="No academic years yet" action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add year</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => (
            <Card key={y.id} className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><CalendarRange size={18} /></span>
                <div>
                  <p className="font-semibold text-foreground">{y.name}</p>
                  {y.isActive ? <Badge variant="success" className="mt-1">Active</Badge> : <span className="text-xs text-muted-foreground">Archived</span>}
                </div>
              </div>
              {!y.isActive && <Button variant="secondary" size="sm" onClick={() => setActive(y.id)}>Set active</Button>}
              {y.isActive && <Check size={18} className="text-success" />}
            </Card>
          ))}
        </div>
      )}

      <AddYearDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <PromoteDrawer
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onPromoted={(res) => setLastBatch(res)}
      />
    </div>
  );
}

function AddYearDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createYear, { isLoading }] = useCreateAcademicYearMutation();
  const nextDefault = () => { const y = new Date().getFullYear(); return `${y + 1}-${y + 2}`; };
  const [name, setName] = useState(nextDefault());
  const [activate, setActivate] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createYear({ name, activate }).unwrap();
      toast.success('Academic year created');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Could not create year');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[400px]">
        <form onSubmit={submit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Add Academic Year</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="name">Year name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="2026-2027" />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]" />
              Make this the active year now
            </label>
            <p className="text-xs text-muted-foreground">Tip: create the new year, activate it, build its classes, then use “Promote students”.</p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Create</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface Row { fromClassId: string; fromSectionId: string; toClassId: string; toSectionId: string }

function PromoteDrawer({
  open, onClose, onPromoted,
}: {
  open: boolean;
  onClose: () => void;
  onPromoted: (res: { batchId: string; moved: number; graduated: number }) => void;
}) {
  const { data } = useGetClassesQuery({ all: true });
  const classes = data?.data ?? [];
  const [previewPromotion, { isLoading: previewing }] = usePreviewPromotionMutation();
  const [promote, { isLoading: promoting }] = usePromoteStudentsMutation();
  const [rows, setRows] = useState<Row[]>([{ fromClassId: '', fromSectionId: '', toClassId: '', toSectionId: '' }]);
  const [graduate, setGraduate] = useState<string[]>([]);
  // Reviewing this list happens before anything is written — a bulk
  // updateMany across every student in a section has no undo *at the
  // moment of the click*, only afterward via the batch banner, so seeing
  // exactly who's affected (and who owes money) first matters here.
  const [preview, setPreview] = useState<PromotionPreview | null>(null);

  const sectionsOf = (classId: string) => classes.find((c) => c.id === classId)?.sections ?? [];
  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const toggleGrad = (id: string) => setGraduate((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const reset = () => {
    setRows([{ fromClassId: '', fromSectionId: '', toClassId: '', toSectionId: '' }]);
    setGraduate([]);
    setPreview(null);
  };

  const body = () => ({
    items: rows.filter((r) => r.fromClassId && r.fromSectionId && r.toClassId && r.toSectionId),
    graduateClassIds: graduate,
  });

  const review = async () => {
    const b = body();
    if (b.items.length === 0 && b.graduateClassIds.length === 0) { toast.error('Add at least one promotion or graduation'); return; }
    try {
      const res = await previewPromotion(b).unwrap();
      setPreview(res.data);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not preview promotion'));
    }
  };

  const confirm = async () => {
    try {
      const res = await promote(body()).unwrap();
      toast.success(`${res.data.moved} promoted, ${res.data.graduated} graduated`);
      onPromoted(res.data);
      onClose();
      reset();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not promote'));
    }
  };

  const selectCls = 'h-9 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[520px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              {preview && (
                <button onClick={() => setPreview(null)} aria-label="Back" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ChevronLeft size={18} />
                </button>
              )}
              <h2 className="text-lg font-semibold">{preview ? 'Review promotion' : 'Promote Students'}</h2>
            </div>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          {preview ? (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <p className="text-sm text-muted-foreground">Double-check this before confirming — it moves every active student listed below right away.</p>

                {preview.items.map((it, i) => (
                  <div key={i} className="rounded-lg border border-border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {it.fromClassName} <ArrowRight size={12} className="inline text-muted-foreground" /> {it.toClassName}
                      </p>
                      {it.type === 'repeated' && <Badge variant="warning">Repeating grade</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{it.studentCount} active student{it.studentCount === 1 ? '' : 's'} will move.</p>
                    {it.studentsWithOutstandingBalance.length > 0 && (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning">
                        <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={12} /> {it.studentsWithOutstandingBalance.length} student(s) have unpaid fees — balance carries forward, not blocked:</p>
                        <ul className="mt-1 space-y-0.5">
                          {it.studentsWithOutstandingBalance.map((s) => (
                            <li key={s.id}>{s.name} ({s.rollNumber}) — Rs {s.balance.toLocaleString('en-PK')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {preview.graduate && (
                  <div className="rounded-lg border border-border p-3.5">
                    <p className="text-sm font-medium text-foreground">Graduating</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preview.graduate.studentCount} active student{preview.graduate.studentCount === 1 ? '' : 's'} will be marked Graduated.</p>
                    {preview.graduate.studentsWithOutstandingBalance.length > 0 && (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning">
                        <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={12} /> {preview.graduate.studentsWithOutstandingBalance.length} graduating student(s) have unpaid fees:</p>
                        <ul className="mt-1 space-y-0.5">
                          {preview.graduate.studentsWithOutstandingBalance.map((s) => (
                            <li key={s.id}>{s.name} ({s.rollNumber}) — Rs {s.balance.toLocaleString('en-PK')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <Button type="button" variant="secondary" onClick={() => setPreview(null)}>Back</Button>
                <Button onClick={confirm} loading={promoting}>Confirm &amp; promote</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <p className="text-sm text-muted-foreground">Move active students from a section into next year's section. Past attendance and results stay under the old class.</p>

                <div className="space-y-3">
                  {rows.map((row, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">From class</Label>
                          <select className={selectCls} value={row.fromClassId} onChange={(e) => setRow(i, { fromClassId: e.target.value, fromSectionId: '' })}>
                            <option value="">Select</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.academicYear}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">From section</Label>
                          <select className={selectCls} value={row.fromSectionId} disabled={!row.fromClassId} onChange={(e) => setRow(i, { fromSectionId: e.target.value })}>
                            <option value="">Select</option>
                            {sectionsOf(row.fromClassId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="my-1.5 flex items-center justify-center text-muted-foreground"><ArrowRight size={14} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">To class</Label>
                          <select className={selectCls} value={row.toClassId} onChange={(e) => setRow(i, { toClassId: e.target.value, toSectionId: '' })}>
                            <option value="">Select</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.academicYear}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">To section</Label>
                          <select className={selectCls} value={row.toSectionId} disabled={!row.toClassId} onChange={(e) => setRow(i, { toSectionId: e.target.value })}>
                            <option value="">Select</option>
                            {sectionsOf(row.toClassId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      {rows.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>Remove</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setRows((r) => [...r, { fromClassId: '', fromSectionId: '', toClassId: '', toSectionId: '' }])} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus size={13} /> Add another promotion
                  </button>
                </div>

                <div>
                  <Label>Graduating classes (final year)</Label>
                  <div className="space-y-1.5">
                    {classes.map((c: ClassItem) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={graduate.includes(c.id)} onChange={() => toggleGrad(c.id)} className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]" />
                        {c.name} <span className="text-muted-foreground">· {c.academicYear}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Active students in these classes will be marked Graduated.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
                <Button onClick={review} loading={previewing}>Review</Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
