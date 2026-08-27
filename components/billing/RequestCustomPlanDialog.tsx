'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRequestCustomPlanMutation } from '@/store/api/billingApi';
import { getErrorMessage } from '@/lib/get-error-message';

const schema = z.object({
  message: z.string().trim().min(10, 'Tell us a bit about what you need (at least 10 characters)').max(2000),
  desiredStudents: z.coerce.number().int().min(1).optional(),
});
type Form = z.infer<typeof schema>;

/**
 * The institution-facing half of the custom-plan feature — none of the
 * public catalog tiers fit every institution (e.g. a much larger student
 * count than Enterprise's default, or a bespoke feature combination), so
 * this is how an admin actually asks for one instead of it only being
 * something a superadmin can initiate unprompted. Submitting here only
 * ever creates a request for a superadmin to review (see PlanRequest,
 * billing-summary.service.ts's requestCustomPlan()) — it never assigns a
 * plan itself. A superadmin still creates the actual custom Plan
 * (isPublic:false) and applies it from this institution's own detail page;
 * the requester finds out the normal way once that's done (their plan
 * picker will show it as their current plan).
 */
export function RequestCustomPlanDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [requestCustomPlan, { isLoading }] = useRequestCustomPlanMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const close = () => {
    setOpen(false);
    setTimeout(() => { setSent(false); reset(); }, 200);
  };

  const onSubmit = async (values: Form) => {
    try {
      await requestCustomPlan(values).unwrap();
      setSent(true);
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not send your request'));
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          {sent ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 size={22} />
              </span>
              <DialogPrimitive.Title className="mt-3 text-base font-semibold">Request sent</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                Our team will review your request and reach out to set up a custom plan for your
                institution.
              </DialogPrimitive.Description>
              <Button className="mt-5 w-full" onClick={close}>Done</Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <DialogPrimitive.Title className="text-base font-semibold">Request a custom plan</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                      Need a different student limit, storage, or feature mix than what&apos;s offered? Tell us what you need.
                    </DialogPrimitive.Description>
                  </div>
                </div>
                <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={16} /></DialogPrimitive.Close>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3.5">
                <div>
                  <Label htmlFor="desiredStudents">Roughly how many students? (optional)</Label>
                  <Input id="desiredStudents" type="number" min={1} placeholder="e.g. 5000" {...register('desiredStudents')} />
                </div>
                <div>
                  <Label htmlFor="message">What do you need?</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    placeholder="e.g. We have 12 campuses and need multi-branch management plus a higher student limit than Enterprise offers."
                    {...register('message')}
                  />
                  {errors.message && <p className="mt-1 text-xs text-danger">{errors.message.message}</p>}
                </div>
                <Button type="submit" className="w-full" loading={isLoading}>Send request</Button>
              </form>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
