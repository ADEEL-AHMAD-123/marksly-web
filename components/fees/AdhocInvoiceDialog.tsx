'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { useGetStudentsQuery } from '@/store/api/studentsApi';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useCreateAdhocInvoicesMutation } from '@/store/api/feesApi';
import { getErrorMessage } from '@/lib/get-error-message';
import { useTerminology } from '@/lib/terminology';

const schema = z.object({
  description: z.string().min(1, 'A description is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/**
 * One-off invoices — a fine, a breakage charge, a one-time event — fully
 * separate from the structured recurring billing engine (see
 * fee.service.ts's createAdhocInvoices()). Targets one student, several
 * picked individually, or a whole class at once.
 */
export function AdhocInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const terminology = useTerminology();
  const [target, setTarget] = useState<'students' | 'class'>('students');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({}); // id -> display name
  const [classId, setClassId] = useState('');

  const { data: studentsRes } = useGetStudentsQuery(
    search.trim().length >= 2 ? { search, limit: 15 } : undefined,
    { skip: search.trim().length < 2 }
  );
  const searchResults = studentsRes?.data ?? [];
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];

  const [createAdhoc, { isLoading }] = useCreateAdhocInvoicesMutation();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', amount: 0, dueDate: new Date().toISOString().slice(0, 10), notes: '' },
  });

  const toggleStudent = (id: string, name: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = name;
      return next;
    });
  };

  const reset_ = () => {
    setTarget('students');
    setSearch('');
    setSelected({});
    setClassId('');
    reset();
  };

  const onSubmit = async (values: FormValues) => {
    const body = target === 'class'
      ? { classId, description: values.description, amount: values.amount, dueDate: values.dueDate, notes: values.notes }
      : { studentIds: Object.keys(selected), description: values.description, amount: values.amount, dueDate: values.dueDate, notes: values.notes };

    if (target === 'class' && !classId) { toast.error(`Pick a ${terminology.classUnit.toLowerCase()}`); return; }
    if (target === 'students' && Object.keys(selected).length === 0) { toast.error('Select at least one student'); return; }

    try {
      const res = await createAdhoc(body).unwrap();
      toast.success(`${res.data.created} invoice(s) created`);
      reset_();
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not create invoice'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset_(); onClose(); } }}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">One-off Invoice</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <p className="text-xs text-muted-foreground">
              Use this for a one-off charge -- a fine, a breakage charge, an event fee -- not routine tuition, which
              is billed automatically from your fee structures under Setup. This never affects that auto-billing.
            </p>

            <div className="flex gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setTarget('students')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${target === 'students' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Specific students
              </button>
              <button
                type="button"
                onClick={() => setTarget('class')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${target === 'class' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Whole {terminology.classUnit.toLowerCase()}
              </button>
            </div>

            {target === 'students' ? (
              <div>
                <Label htmlFor="ah-search">Search students</Label>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="ah-search" className="pl-9" placeholder="Name or roll number" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {search.trim().length >= 2 && (
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                    {searchResults.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">No matching students</p>
                    ) : (
                      searchResults.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleStudent(s.id, `${s.name} · ${s.rollNumber}`)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        >
                          <span>{s.name} <span className="text-muted-foreground">· {s.rollNumber}</span></span>
                          {selected[s.id] && <Check size={14} className="text-primary" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {Object.keys(selected).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(selected).map(([id, name]) => (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                        {name}
                        <button type="button" onClick={() => toggleStudent(id, name)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Label>{terminology.classUnit}</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder={`Select a ${terminology.classUnit.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">Bills every active student currently in this {terminology.classUnit.toLowerCase()}.</p>
              </div>
            )}

            <div>
              <Label htmlFor="ah-description">Description</Label>
              <Input id="ah-description" placeholder="e.g. Library book fine" {...register('description')} />
              {errors.description && <p className="mt-1 text-xs text-danger">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ah-amount">Amount</Label>
                <Input id="ah-amount" type="number" {...register('amount')} />
                {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>}
              </div>
              <div>
                <Label htmlFor="ah-dueDate">Due date</Label>
                <input id="ah-dueDate" type="date" {...register('dueDate')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
            <div>
              <Label htmlFor="ah-notes">Notes (optional)</Label>
              <Input id="ah-notes" {...register('notes')} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary" onClick={reset_}>Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Create invoice(s)</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
