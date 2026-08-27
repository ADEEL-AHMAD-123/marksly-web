'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Package, Plus, Pencil, Trash2, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import {
  useGetPlansQuery, useCreatePlanMutation, useUpdatePlanMutation, useDeletePlanMutation,
  type Plan,
} from '@/store/api/superadminApi';
import { formatCurrency, cn } from '@/lib/utils';

const ALL_FEATURES = [
  { key: 'whatsapp', label: 'WhatsApp notifications' },
  { key: 'aiReports', label: 'AI progress reports' },
  { key: 'multibranch', label: 'Multi-branch management' },
];
const featureLabel = (k: string) => ALL_FEATURES.find((f) => f.key === k)?.label ?? k;

export function PlansView() {
  const { data, isLoading } = useGetPlansQuery();
  const plans = data?.data ?? [];
  const [editing, setEditing] = useState<Plan | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletePlan] = useDeletePlanMutation();

  const handleDelete = async (p: Plan) => {
    try { await deletePlan(p.id).unwrap(); toast.success('Plan deleted'); }
    catch (e: any) { toast.error(e?.data?.error?.message || 'Could not delete plan'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Edit pricing, limits and features for the subscription catalog."
        actions={<Button size="sm" onClick={() => setAdding(true)}><Plus size={16} /> Add plan</Button>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary-soft-foreground">
        <Info size={17} className="mt-0.5 shrink-0" />
        <span>Editing a plan's price only affects <strong>new</strong> subscriptions and future plan changes. Institutions already subscribed keep the price they signed up at until you re-assign their plan.</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-56 w-full" /></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <Card key={p.id} className={cn('flex flex-col p-5', p.key === 'standard' && 'ring-2 ring-primary')}>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Package size={18} /></span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(p)} aria-label="Edit plan" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(p)} aria-label="Delete plan" className="rounded-lg p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger"><Trash2 size={15} /></button>
                </div>
              </div>
              {!p.isPublic && (
                <Badge variant="warning" className="mt-3 w-fit">Custom — hidden from public/other institutions</Badge>
              )}
              <p className={cn('text-lg font-semibold text-foreground', p.isPublic ? 'mt-3' : 'mt-2')}>{p.name}</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-foreground">{p.price === 0 ? 'Free' : formatCurrency(p.price)}</span>
                {p.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground"><Check size={15} className="text-success" /> Up to {p.studentsLimit.toLocaleString('en-PK')} students</li>
                <li className="flex items-center gap-2 text-muted-foreground"><Check size={15} className="text-success" /> {p.storageGB} GB storage</li>
                {p.features.map((f) => <li key={f} className="flex items-center gap-2 text-muted-foreground"><Check size={15} className="text-success" /> {featureLabel(f)}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <PlanDrawer plan={editing} open={!!editing || adding} onClose={() => { setEditing(null); setAdding(false); }} />
    </div>
  );
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  price: z.coerce.number().min(0),
  studentsLimit: z.coerce.number().int().min(1),
  storageGB: z.coerce.number().int().min(1),
});
type PlanForm = z.infer<typeof schema>;

function PlanDrawer({ plan, open, onClose }: { plan: Plan | null; open: boolean; onClose: () => void }) {
  const isEdit = !!plan;
  const [createPlan, { isLoading: creating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: updating }] = useUpdatePlanMutation();
  const [features, setFeatures] = useState<string[]>([]);
  // Uncheck for a bespoke, single-institution deal (e.g. an institution
  // requested custom pricing/limits) — keeps it out of the public pricing
  // page and out of every OTHER institution's own plan picker. See
  // Plan.isPublic's comment on the backend. Defaults to true (a normal,
  // publicly-offered tier) for new plans.
  const [isPublic, setIsPublic] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlanForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ name: plan?.name ?? '', price: plan?.price ?? 0, studentsLimit: plan?.studentsLimit ?? 50, storageGB: plan?.storageGB ?? 1 });
      setFeatures(plan?.features ?? []);
      setIsPublic(plan?.isPublic ?? true);
    }
  }, [open, plan, reset]);

  const toggle = (k: string) => setFeatures((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const onSubmit = async (values: PlanForm) => {
    try {
      if (isEdit && plan) {
        await updatePlan({ id: plan.id, body: { ...values, features, isPublic } }).unwrap();
        toast.success('Plan updated');
      } else {
        await createPlan({ ...values, features, isPublic }).unwrap();
        toast.success('Plan created');
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save plan');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{isEdit ? `Edit ${plan?.name}` : 'Add Plan'}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="name">Plan name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Price (PKR/mo)</Label>
                <Input id="price" type="number" {...register('price')} />
                {errors.price && <p className="mt-1 text-xs text-danger">{errors.price.message}</p>}
              </div>
              <div>
                <Label htmlFor="storageGB">Storage (GB)</Label>
                <Input id="storageGB" type="number" {...register('storageGB')} />
              </div>
            </div>
            <div>
              <Label htmlFor="studentsLimit">Students limit</Label>
              <Input id="studentsLimit" type="number" {...register('studentsLimit')} />
            </div>
            <div>
              <Label>Features</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_FEATURES.map((f) => {
                  const active = features.includes(f.key);
                  return (
                    <button key={f.key} type="button" onClick={() => toggle(f.key)}
                      className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground hover:bg-muted')}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="block font-medium text-foreground">Public plan</span>
                <span className="block text-xs text-muted-foreground">
                  Shown on the pricing page and selectable by any institution. Uncheck for a custom
                  plan negotiated for one specific institution — assign it to them from their
                  institution page instead.
                </span>
              </span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={creating || updating}>{isEdit ? 'Save changes' : 'Create plan'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
