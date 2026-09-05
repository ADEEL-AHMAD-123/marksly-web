'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, FileStack, Receipt } from 'lucide-react';
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
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { useGetClassesQuery } from '@/store/api/classesApi';
import {
  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useGenerateInvoicesMutation,
  type FeeStructure,
} from '@/store/api/feesApi';
import { formatCurrency } from '@/lib/utils';
import { useTerminology } from '@/lib/terminology';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function StructuresTab() {
  const { data, isLoading } = useGetFeeStructuresQuery();
  const structures = data?.data ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [generateFor, setGenerateFor] = useState<FeeStructure | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add structure</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-28 w-full" /></Card>)}
        </div>
      ) : structures.length === 0 ? (
        <Card><EmptyState icon={FileStack} title="No fee structures yet" description="Create a structure (e.g. Monthly Tuition) then generate invoices for students." action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add structure</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {structures.map((s) => (
            <Card key={s.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.academicYear} · {s.className ?? 'All classes'}</p>
                  {s.autoBill && <Badge variant="success" className="mt-1">Auto-bill · due {s.dueDay}th</Badge>}
                </div>
                <Badge variant="primary">{formatCurrency(s.total)}</Badge>
              </div>
              <div className="mt-3 flex-1 space-y-1">
                {s.components.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="text-foreground">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setGenerateFor(s)}>
                <Receipt size={15} /> Generate invoices
              </Button>
            </Card>
          ))}
        </div>
      )}

      <AddStructureDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <GenerateDrawer structure={generateFor} onClose={() => setGenerateFor(null)} />
    </div>
  );
}

/* ── Add structure ─────────────────────────────────────────────────────────── */
const structSchema = z.object({
  name: z.string().min(1, 'Required'),
  academicYear: z.string().min(4, 'Required'),
  classId: z.string().optional(),
  autoBill: z.boolean(),
  dueDay: z.coerce.number().int().min(1).max(28),
  components: z.array(z.object({
    name: z.string().min(1, 'Required'),
    amount: z.coerce.number().min(0, '≥ 0'),
    frequency: z.enum(['monthly', 'quarterly', 'annually', 'once']),
  })).min(1, 'Add at least one component'),
});
type StructForm = z.infer<typeof structSchema>;

function defaultYear() { const y = new Date().getFullYear(); return `${y}-${y + 1}`; }

function AddStructureDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const terminology = useTerminology();
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [createStructure, { isLoading }] = useCreateFeeStructureMutation();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<StructForm>({
    resolver: zodResolver(structSchema),
    defaultValues: { name: '', academicYear: defaultYear(), classId: '', autoBill: false, dueDay: 10, components: [{ name: 'Tuition', amount: 0, frequency: 'monthly' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'components' });

  const onSubmit = async (values: StructForm) => {
    try {
      await createStructure({ ...values, classId: values.classId || undefined }).unwrap();
      toast.success('Fee structure created');
      reset({ name: '', academicYear: defaultYear(), classId: '', autoBill: false, dueDay: 10, components: [{ name: 'Tuition', amount: 0, frequency: 'monthly' }] });
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not create structure');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Add Fee Structure</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g. Monthly Tuition" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="academicYear">Billing period label</Label>
                <Input id="academicYear" {...register('academicYear')} placeholder="e.g. Fall 2026, or 2025-2026" />
                {/* Free text on purpose — this is just a label shown on the
                    structure card, independent of the institution's real
                    Terms (Academic Years/Semesters/Sessions). It won't
                    auto-track a term's name, so word it however makes sense
                    for this fee structure rather than assuming it must
                    match a term exactly. */}
                {errors.academicYear && <p className="mt-1 text-xs text-danger">{errors.academicYear.message}</p>}
              </div>
              <div>
                <Label>{terminology.classUnit} (optional)</Label>
                <Controller
                  control={control}
                  name="classId"
                  render={({ field }) => (
                    <Select value={field.value || 'all'} onValueChange={(v) => field.onChange(v === 'all' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder={`All ${terminology.classUnitPlural.toLowerCase()}`} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {terminology.classUnitPlural.toLowerCase()}</SelectItem>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="mb-0">Components</Label>
                <button type="button" onClick={() => append({ name: '', amount: 0, frequency: 'monthly' })} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus size={13} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Input placeholder="Name" className="flex-1" {...register(`components.${i}.name` as const)} />
                    <Input type="number" placeholder="Amount" className="w-28" {...register(`components.${i}.amount` as const)} />
                    <select {...register(`components.${i}.frequency` as const)} className="h-10 w-28 rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                      <option value="once">One-time</option>
                    </select>
                    <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {errors.components && <p className="mt-1 text-xs text-danger">{(errors.components as any).message || 'Check components'}</p>}
            </div>

            <div className="rounded-xl border border-border p-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" {...register('autoBill')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Auto-bill every month</span>
                  <span className="block text-xs text-muted-foreground">The monthly components are billed automatically on the 1st of each month.</span>
                </span>
              </label>
              <div className="mt-3 flex items-center gap-2">
                <Label htmlFor="dueDay" className="mb-0 text-xs">Due day of month</Label>
                <Input id="dueDay" type="number" min={1} max={28} className="w-20" {...register('dueDay')} />
              </div>
            </div>
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

/* ── Generate invoices ─────────────────────────────────────────────────────── */
const genSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  dueDate: z.string().min(1, 'Required'),
});
type GenForm = z.infer<typeof genSchema>;

function GenerateDrawer({ structure, onClose }: { structure: FeeStructure | null; onClose: () => void }) {
  const [generate, { isLoading }] = useGenerateInvoicesMutation();
  const open = !!structure;
  const now = new Date();

  const { register, handleSubmit } = useForm<GenForm>({
    resolver: zodResolver(genSchema),
    values: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      dueDate: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values: GenForm) => {
    if (!structure) return;
    try {
      const res = await generate({ feeStructureId: structure.id, ...values }).unwrap();
      toast.success(`${res.data.created} invoices created, ${res.data.skipped} skipped`);
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not generate invoices');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[400px]">
        {structure && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">Generate Invoices</h2>
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="rounded-xl bg-muted p-4">
                <p className="font-medium text-foreground">{structure.name}</p>
                <p className="text-xs text-muted-foreground">{structure.className ?? 'All classes'} · {formatCurrency(structure.total)} each</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Month</Label>
                  <select {...register('month')} className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" type="number" {...register('year')} />
                </div>
              </div>
              <div>
                <Label htmlFor="dueDate">Due date</Label>
                <input id="dueDate" type="date" {...register('dueDate')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <p className="text-xs text-muted-foreground">
                Invoices are created for every active student in scope. Students who already have an invoice for this month are skipped.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
              <Button type="submit" loading={isLoading}>Generate</Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
