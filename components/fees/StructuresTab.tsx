'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, FileStack, Receipt, Pencil, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { useGetClassesQuery } from '@/store/api/classesApi';
import { useGetTermsQuery } from '@/store/api/termsApi';
import {
  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useUpdateFeeStructureMutation,
  useGenerateInvoicesMutation,
  useGenerateTermInvoicesMutation,
  type FeeStructure,
  type FeeCategory,
  type FeeApplicabilityMode,
  type ProrationPolicy,
} from '@/store/api/feesApi';
import { getErrorMessage } from '@/lib/get-error-message';
import { formatCurrency } from '@/lib/utils';
import { useTerminology } from '@/lib/terminology';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CATEGORY_LABEL: Record<FeeCategory, string> = {
  tuition: 'Tuition',
  admission: 'Admission / Registration',
  transport: 'Transport',
  hostel: 'Hostel / Boarding',
  library: 'Library',
  sports: 'Sports / Co-curricular',
  exam: 'Board / Exam Registration',
  misc: 'Miscellaneous',
};

/** '1st'/'2nd'/'3rd'/'4th'... for a due-day caption -- no existing
 *  formatting utility in the codebase does this. */
function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
const APPLICABILITY_LABEL: Record<FeeApplicabilityMode, string> = {
  'all-students-in-class': 'All students automatically',
  'opt-in': 'Only opted-in students',
  'one-time-event': 'One-time event / eligible cohort',
};

const PRORATION_LABEL: Record<ProrationPolicy, string> = {
  full: 'Bill full amount, even mid-period',
  'prorate-daily': 'Prorate by remaining days',
  'skip-first-period': "Skip the student's first partial period",
};


/**
 * `autoOpenOnEmpty` lets a caller (the Fees page, when someone arrives via
 * the onboarding checklist's "Set up fee structures" link) skip the extra
 * click of finding "Add structure" themselves — but ONLY when the list is
 * genuinely empty. If structures already exist, the same deep link should
 * land here to review/manage what's there, not blindly pop open another
 * "add" form on top of existing data.
 */
export function StructuresTab({ autoOpenOnEmpty }: { autoOpenOnEmpty?: boolean } = {}) {
  const { data, isLoading } = useGetFeeStructuresQuery();
  const structures = data?.data ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [generateFor, setGenerateFor] = useState<FeeStructure | null>(null);
  const [editStructure, setEditStructure] = useState<FeeStructure | null>(null);
  // Seeds the Add drawer from an existing structure's data (minus its class)
  // so setting up the same fee for a second/third class doesn't mean
  // re-learning and re-typing the whole form again.
  const [duplicateFrom, setDuplicateFrom] = useState<FeeStructure | null>(null);

  useEffect(() => {
    if (autoOpenOnEmpty && !isLoading && structures.length === 0) setAddOpen(true);
    // Only ever auto-opens once, right when the empty state is first
    // confirmed — never re-fires just because `structures` re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenOnEmpty, isLoading]);

  return (
    <div className="space-y-4">
      {/* Matches PayoutAccountsTab.tsx's own header+button row -- a
          left-aligned section label keeps this from being a single button
          floating flush-right above a wide empty gap. The empty state below
          has its own identical CTA when there's nothing yet. */}
      {structures.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Your fee structures</p>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add structure</Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-28 w-full" /></Card>)}
        </div>
      ) : structures.length === 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileStack size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No fee structures yet</p>
              <p className="text-xs text-muted-foreground">e.g. Monthly Tuition -- add one to start generating invoices.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add structure</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {structures.map((s) => (
            <Card key={s.id} className={`flex flex-col p-5 ${!s.isActive ? 'border-dashed opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    {/* Inactive was previously just a 4th badge that could
                        wrap out of view in the badge row below -- now it's
                        right next to the name (where the eye already lands
                        first) plus a dashed card border, so a retired
                        structure can't be mistaken for a live one. */}
                    {!s.isActive && <Badge variant="neutral">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.academicYear} · {s.className ?? 'All classes'}</p>
                  {/* Category/opt-in are the only two facts that change
                      what a structure fundamentally IS, so they're the only
                      pills left -- billing mechanics (auto-bill, due day)
                      moved to a plain caption line below instead of a 3rd
                      pill, since a badge implies "category" more than
                      "schedule". */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="neutral">{CATEGORY_LABEL[s.category] ?? s.category}</Badge>
                    {s.applicabilityMode === 'opt-in' && <Badge variant="warning">Opt-in</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.autoBill ? `Bills automatically, due on the ${s.dueDay}${ordinalSuffix(s.dueDay)}` : 'Manual billing only -- generated on request'}
                  </p>
                </div>
                <Badge variant="primary" className="shrink-0">{formatCurrency(s.total)}</Badge>
              </div>
              {/* Redundant for the common single-charge case (the total
                  badge above already says the same number) -- only worth a
                  breakdown once there's more than one line to add up. */}
              {s.components.length > 1 && (
                <div className="mt-3 flex-1 space-y-1">
                  {s.components.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="text-foreground">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setGenerateFor(s)}
                  title="Pick any month/term to generate for -- for backfilling a missed period, not the routine monthly run"
                >
                  <Receipt size={15} /> Generate for a period…
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditStructure(s)}>
                  <Pencil size={15} /> Edit
                </Button>
                <Button variant="secondary" size="sm" title="Copy this to another class" onClick={() => setDuplicateFrom(s)}>
                  <Copy size={15} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddStructureDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <AddStructureDrawer open={!!duplicateFrom} onClose={() => setDuplicateFrom(null)} duplicateFrom={duplicateFrom} />
      <GenerateDrawer structure={generateFor} onClose={() => setGenerateFor(null)} />
      <EditStructureDrawer structure={editStructure} onClose={() => setEditStructure(null)} />
    </div>
  );
}

/* ── Add structure ─────────────────────────────────────────────────────────── */
const structSchema = z.object({
  name: z.string().min(1, 'Required'),
  academicYear: z.string().min(4, 'Required'),
  termId: z.string().optional(),
  category: z.enum(['tuition', 'admission', 'transport', 'hostel', 'library', 'sports', 'exam', 'misc']),
  applicabilityMode: z.enum(['all-students-in-class', 'opt-in', 'one-time-event']),
  classId: z.string().optional(),
  autoBill: z.boolean(),
  dueDay: z.coerce.number().int().min(1).max(28),
  prorationPolicy: z.enum(['full', 'prorate-daily', 'skip-first-period']),
  components: z.array(z.object({
    name: z.string().min(1, 'Required'),
    amount: z.coerce.number().min(0, '≥ 0'),
    frequency: z.enum(['monthly', 'quarterly', 'annually', 'once', 'per-term']),
  })).min(1, 'Add at least one component'),
});
type StructForm = z.infer<typeof structSchema>;

function defaultYear() { const y = new Date().getFullYear(); return `${y}-${y + 1}`; }

function AddStructureDrawer({ open, onClose, duplicateFrom }: { open: boolean; onClose: () => void; duplicateFrom?: FeeStructure | null }) {
  const terminology = useTerminology();
  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data ?? [];
  const [createStructure, { isLoading }] = useCreateFeeStructureMutation();

  const { data: termsRes } = useGetTermsQuery();
  const terms = termsRes?.data ?? [];
  const blankDefaults: StructForm = {
    name: '', academicYear: defaultYear(), termId: '', category: 'tuition', applicabilityMode: 'all-students-in-class',
    classId: '', autoBill: false, dueDay: 10, prorationPolicy: 'full', components: [{ name: 'Tuition', amount: 0, frequency: 'monthly' }],
  };
  // Everything copies over except classId -- the whole point is picking a
  // *different* class -- and the name gets a "(copy)" suffix so it's
  // obviously not the same structure until renamed.
  const defaults: StructForm = duplicateFrom
    ? {
        name: `${duplicateFrom.name} (copy)`,
        academicYear: duplicateFrom.academicYear,
        termId: duplicateFrom.termId ?? '',
        category: duplicateFrom.category,
        applicabilityMode: duplicateFrom.applicabilityMode,
        classId: '',
        autoBill: duplicateFrom.autoBill,
        dueDay: duplicateFrom.dueDay,
        prorationPolicy: duplicateFrom.prorationPolicy,
        components: duplicateFrom.components.map((c) => ({ name: c.name, amount: c.amount, frequency: c.frequency as StructForm['components'][number]['frequency'] })),
      }
    : blankDefaults;
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<StructForm>({
    resolver: zodResolver(structSchema),
    values: defaults,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'components' });
  const applicabilityMode = watch('applicabilityMode');
  const componentValues = watch('components');
  const termId = watch('termId');

  // The "Name" field used to be a source of real confusion: with a single
  // component (the overwhelming common case -- one fee, one amount), admins
  // had to type essentially the same thing twice ("Monthly Tuition" here,
  // then "Tuition" again as the one component's name below). While there's
  // exactly one component and the admin hasn't deliberately renamed the
  // structure themselves, we keep the two in sync automatically. The
  // moment a second component is added, or the admin edits the name
  // directly, autosync stops -- a bundle of several fees genuinely needs
  // its own name (e.g. "Term Fee Package") that isn't any one component's.
  const [nameEdited, setNameEdited] = useState(!!duplicateFrom);
  // Whether the "Structure name" field is actually shown. For the common
  // single-charge case it stays hidden entirely -- one less field to fill
  // in -- and only appears once there's a real bundle (2+ charges) or the
  // admin explicitly asks to customize the bill label.
  const [nameRevealed, setNameRevealed] = useState(!!duplicateFrom);
  // Same idea for the billing-period label vs. a linked Term: picking a
  // real Term already implies a period, so typing the label a second time
  // is redundant busywork -- unless the admin wants a custom label instead.
  const [yearEdited, setYearEdited] = useState(!!duplicateFrom);
  // When there's exactly one term to choose from, a dropdown offering
  // "that one term" vs. "no term" is a pointless-feeling decision --
  // replaced below with a single checkbox, pre-checked since linking is
  // the recommended default. `termTouched` tracks whether the admin has
  // deliberately unchecked it, so we don't fight their choice.
  const [termTouched, setTermTouched] = useState(!!duplicateFrom);
  // With only one term to choose from, the field itself is hidden by
  // default (same treatment as the single-charge Structure name above) --
  // it's silently linked and a plain sentence says so, with a "Change"
  // link for the rare case someone wants this one structure to skip it.
  const [termRevealed, setTermRevealed] = useState(!!duplicateFrom);

  useEffect(() => {
    if (open) {
      setNameEdited(!!duplicateFrom);
      setNameRevealed(!!duplicateFrom);
      setYearEdited(!!duplicateFrom);
      setTermTouched(!!duplicateFrom);
      setTermRevealed(!!duplicateFrom);
    }
  }, [open, duplicateFrom]);

  const soleTerm = terms.length === 1 ? terms[0] : null;

  useEffect(() => {
    if (!soleTerm || termTouched) return;
    setValue('termId', soleTerm.id, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soleTerm?.id, termTouched]);

  useEffect(() => {
    if (nameEdited) return;
    if (!componentValues || componentValues.length === 0) return;
    const names = componentValues.map((c: any) => (c?.name || '').trim()).filter(Boolean);
    if (names.length === 0) return;
    if (names.length === 1) {
      setValue('name', names[0], { shouldValidate: false });
      return;
    }
    // Bundle of 2+ charges: suggest "Tuition + Transport" (up to 3 names,
    // then "+N more") as a starting point -- still editable, since a
    // bundle's bill label is often shortened to something like "Term Fee
    // Package" rather than a literal join of every charge in it.
    const shown = names.slice(0, 3).join(' + ');
    const extra = names.length > 3 ? ` +${names.length - 3} more` : '';
    setValue('name', `${shown}${extra}`, { shouldValidate: false });
  }, [componentValues, nameEdited, setValue]);

  useEffect(() => {
    if (yearEdited || !termId) return;
    const term = terms.find((t: any) => t.id === termId);
    if (term?.name) setValue('academicYear', term.name, { shouldValidate: false });
  }, [termId, terms, yearEdited, setValue]);

  const nameField = register('name');
  const academicYearField = register('academicYear');
  const componentsTotal = (componentValues ?? []).reduce((sum, c) => sum + (Number(c?.amount) || 0), 0);
  const isBundle = fields.length > 1;
  const showNameField = isBundle || nameEdited || nameRevealed;

  const onSubmit = async (values: StructForm) => {
    try {
      await createStructure({ ...values, classId: values.classId || undefined, termId: values.termId || undefined }).unwrap();
      toast.success(duplicateFrom ? 'Fee structure copied' : 'Fee structure created');
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
            <h2 className="text-lg font-semibold">{duplicateFrom ? 'Copy Fee Structure' : 'Add Fee Structure'}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you're charging</p>
              <div className="mt-2 space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Input placeholder="e.g. Tuition" className="flex-1" {...register(`components.${i}.name` as const)} />
                    <Input type="number" placeholder="e.g. 5000" className="w-28" {...register(`components.${i}.amount` as const)} />
                    <Controller
                      control={control}
                      name={`components.${i}.frequency` as const}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="per-term">Per term</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                            <SelectItem value="once">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button type="button" onClick={() => append({ name: '', amount: 0, frequency: 'monthly' })} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus size={13} /> Add another charge
                </button>
                {componentsTotal > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">Total: {formatCurrency(componentsTotal)}</span>
                )}
              </div>
              {errors.components && <p className="mt-1 text-xs text-danger">{(errors.components as any).message || 'Check components'}</p>}
              <p className="mt-1.5 text-xs text-muted-foreground">
                One line per charge -- e.g. just "Tuition," or several lines like "Tuition," "Transport," "Library" bundled under one bill.
              </p>
            </div>

            <div className="border-t border-border pt-4">
              {showNameField ? (
                <>
                  <Label htmlFor="name">Structure name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Monthly Tuition"
                    {...nameField}
                    onChange={(e) => { setNameEdited(true); nameField.onChange(e); }}
                  />
                  {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isBundle
                      ? (nameEdited
                          ? 'This is what parents/students see on the bill for the whole group of charges above.'
                          : "Suggested from the charges above -- edit it if you'd like something shorter, like \"Term Fee Package.\"")
                      : 'This is what parents/students see on the bill.'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Bill label: <span className="font-medium text-foreground">{componentValues?.[0]?.name || '—'}</span>
                  {' '}<button type="button" onClick={() => setNameRevealed(true)} className="font-medium text-primary hover:underline">Use a different label</button>
                </p>
              )}
            </div>

            {/* Category+Class grouped first -- "what kind of fee, for
                which class" is the most consequential pair of choices here
                (it's what FeeCoveragePanel checks per class), so it leads
                instead of trailing after Category+Applicability. Applies-to
                now sits directly next to its own opt-in explanation instead
                of sharing a row with Category, which it has nothing to do
                with. */}
            <div className="border-t border-border pt-4 grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABEL) as FeeCategory[]).map((c) => (
                          <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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

            <div className="border-t border-border pt-4">
              <Label>Applies to</Label>
              <Controller
                control={control}
                name="applicabilityMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(APPLICABILITY_LABEL) as FeeApplicabilityMode[]).map((m) => (
                        <SelectItem key={m} value={m}>{APPLICABILITY_LABEL[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {applicabilityMode === 'opt-in' && (
                <p className="mt-1.5 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                  Only students you explicitly opt in (from their profile) will be billed for this — nothing is charged automatically. Good for Transport/Hostel.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <Label>Term</Label>
              {soleTerm && !termRevealed ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Linked to <span className="font-medium text-foreground">{soleTerm.name}</span> -- your only term.
                  {' '}<button type="button" onClick={() => setTermRevealed(true)} className="font-medium text-primary hover:underline">Change</button>
                </p>
              ) : soleTerm ? (
                <>
                  <label className="mt-1 flex items-start gap-2.5 rounded-lg border border-border p-3">
                    <input
                      type="checkbox"
                      checked={!!termId}
                      onChange={(e) => {
                        setTermTouched(true);
                        setValue('termId', e.target.checked ? soleTerm.id : '', { shouldValidate: false });
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">Link to {soleTerm.name}</span>
                      <span className="block text-xs text-muted-foreground">Recommended -- uncheck only if this structure needs a custom billing-period label instead.</span>
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use a "Per term" charge above for university/college billing — the same engine bills monthly for schools using an academic-year Term.
                  </p>
                </>
              ) : (
                <>
                  <Controller
                    control={control}
                    name="termId"
                    render={({ field }) => (
                      <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Link to a real term" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No term (set a custom label below instead)</SelectItem>
                          {terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Link a semester Term and use a "Per term" charge above for university/college billing — the same engine bills monthly for schools using an academic-year Term.
                  </p>
                </>
              )}
              <div className="mt-2">
                <Label htmlFor="academicYear" className="text-xs">Billing period label</Label>
                <Input
                  id="academicYear"
                  {...academicYearField}
                  onChange={(e) => { setYearEdited(true); academicYearField.onChange(e); }}
                  placeholder="e.g. Fall 2026, or 2025-2026"
                />
                {errors.academicYear && <p className="mt-1 text-xs text-danger">{errors.academicYear.message}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {termId ? "Filled in from the term you picked above -- edit it if you'd like a different label." : 'Used to group and report on bills from this structure.'}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="mb-0">When are bills due?</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Applies to every bill generated from this structure -- whether by auto-bill below or you generating it manually.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Input id="dueDay" type="number" min={1} max={28} className="w-20" {...register('dueDay')} />
                <span className="text-sm text-muted-foreground">day of the month</span>
              </div>
              <label className="mt-3 flex items-start gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" {...register('autoBill')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Auto-bill every month</span>
                  <span className="block text-xs text-muted-foreground">Generates the monthly charges above automatically on the 1st -- leave this off if you'd rather click "Generate this month's bills" yourself.</span>
                </span>
              </label>
            </div>

            <div className="border-t border-border pt-4">
              <Label>Mid-period enrollment</Label>
              <Controller
                control={control}
                name="prorationPolicy"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRORATION_LABEL) as ProrationPolicy[]).map((p) => (
                        <SelectItem key={p} value={p}>{PRORATION_LABEL[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">How a student who enrolls partway through a billing period is charged for that first period.</p>
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

/* ── Edit structure ────────────────────────────────────────────────────────── */
const editStructSchema = z.object({
  name: z.string().min(1, 'Required'),
  isActive: z.boolean(),
  autoBill: z.boolean(),
  dueDay: z.coerce.number().int().min(1).max(28),
  prorationPolicy: z.enum(['full', 'prorate-daily', 'skip-first-period']),
  components: z.array(z.object({
    name: z.string().min(1, 'Required'),
    amount: z.coerce.number().min(0, '≥ 0'),
    frequency: z.enum(['monthly', 'quarterly', 'annually', 'once', 'per-term']),
  })).min(1, 'Add at least one component'),
});
type EditStructForm = z.infer<typeof editStructSchema>;

function EditStructureDrawer({ structure, onClose }: { structure: FeeStructure | null; onClose: () => void }) {
  const open = !!structure;
  const [updateStructure, { isLoading }] = useUpdateFeeStructureMutation();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EditStructForm>({
    resolver: zodResolver(editStructSchema),
    // "values" (not just a one-time defaultValues) so switching which
    // structure is being edited re-seeds the form from that structure's
    // current data rather than carrying over the previous one's.
    values: structure
      ? {
          name: structure.name,
          isActive: structure.isActive,
          autoBill: structure.autoBill,
          dueDay: structure.dueDay,
          prorationPolicy: structure.prorationPolicy,
          components: structure.components.map((c) => ({ name: c.name, amount: c.amount, frequency: (c.frequency as EditStructForm['components'][number]['frequency']) || 'monthly' })),
        }
      : undefined,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'components' });

  const onSubmit = async (values: EditStructForm) => {
    if (!structure) return;
    try {
      await updateStructure({ id: structure.id, ...values }).unwrap();
      toast.success('Fee structure updated');
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not update structure'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        {structure && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">Edit Fee Structure</h2>
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                {structure.academicYear} · {structure.className ?? 'All classes'} · {CATEGORY_LABEL[structure.category] ?? structure.category} · {APPLICABILITY_LABEL[structure.applicabilityMode] ?? structure.applicabilityMode} — the billing period, class, category and applicability can't be changed here; create a new structure instead.
              </p>

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
                      <Input type="number" placeholder="e.g. 5000" className="w-28" {...register(`components.${i}.amount` as const)} />
                      <Controller
                        control={control}
                        name={`components.${i}.frequency` as const}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="per-term">Per term</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                              <SelectItem value="once">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <button type="button" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length <= 1} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.components && <p className="mt-1 text-xs text-danger">{(errors.components as any).message || 'Check components'}</p>}
              </div>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" {...register('autoBill')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">Auto-bill every month</span>
                    <span className="block text-xs text-muted-foreground">The monthly components are billed automatically on the 1st of each month.</span>
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="edit-dueDay" className="mb-0 text-xs">Due day of month</Label>
                  <Input id="edit-dueDay" type="number" min={1} max={28} className="w-20" {...register('dueDay')} />
                </div>
                <div>
                  <Label>Mid-period enrollment</Label>
                  <Controller
                    control={control}
                    name="prorationPolicy"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRORATION_LABEL) as ProrationPolicy[]).map((p) => (
                            <SelectItem key={p} value={p}>{PRORATION_LABEL[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <label className="flex items-start gap-3">
                  <input type="checkbox" {...register('isActive')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">Active</span>
                    <span className="block text-xs text-muted-foreground">Turn this off to retire the structure — it stops appearing as an option for new invoices/billing without deleting its history.</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
              <Button type="submit" loading={isLoading}>Save changes</Button>
            </div>
          </form>
        )}
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
  const [generateTerm, { isLoading: isLoadingTerm }] = useGenerateTermInvoicesMutation();
  const open = !!structure;
  const now = new Date();
  const isPerTerm = structure?.components?.some((c) => c.frequency === 'per-term') && !!structure?.termId;

  const { register, handleSubmit, control } = useForm<GenForm>({
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

  const onGenerateTerm = async () => {
    if (!structure?.termId) return;
    try {
      const res = await generateTerm({ feeStructureId: structure.id, termId: structure.termId }).unwrap();
      toast.success(`${res.data.created} invoices created for ${res.data.termName}, ${res.data.skipped} skipped`);
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not generate term invoices');
    }
  };

  if (isPerTerm) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[400px]">
          {structure && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold">Generate Term Invoices</h2>
                <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="rounded-xl bg-muted p-4">
                  <p className="font-medium text-foreground">{structure.name}</p>
                  <p className="text-xs text-muted-foreground">{structure.className ?? 'All classes'} · {formatCurrency(structure.total)} per term</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This bills once for the whole linked term, due on the term's own start date. Students who already have an invoice for this term are skipped — safe to run again.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
                <Button type="button" loading={isLoadingTerm} onClick={onGenerateTerm}>Generate for this term</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

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
              <p className="text-xs text-muted-foreground">
                For this one structure only, for whichever month/year you pick below -- use Collections' "Generate this month's bills" instead when you just want the current month across every structure at once.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Controller
                    control={control}
                    name="month"
                    render={({ field }) => (
                      <Select value={String(field.value)} onValueChange={field.onChange}>
                        <SelectTrigger id="month"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
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
