'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Landmark, Star, Trash2, X, Pencil, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoNote } from '@/components/ui/info-note';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useGetPayoutAccountsQuery,
  useCreatePayoutAccountMutation,
  useDeletePayoutAccountMutation,
  useUpdatePayoutAccountMutation,
  PAKISTANI_BANKS,
  type PayoutAccount,
} from '@/store/api/feesApi';
import { getErrorMessage } from '@/lib/get-error-message';

/**
 * Where fee challans point parents or students to pay -- an institution can list
 * several of its own real bank accounts here; Marksly never touches this
 * money, it only shows these details on the challan (see fee.service.ts's
 * createAdhocInvoices()/createInvoicesFor() payoutAccountId snapshot).
 */
/**
 * `autoOpenOnEmpty` mirrors StructuresTab.tsx's own pattern -- a deep link
 * from the onboarding checklist/setup-status strip ("Add a bank account")
 * should only pop the drawer open when there's genuinely nothing here yet,
 * never on top of accounts that already exist.
 */
export function PayoutAccountsTab({ autoOpenOnEmpty }: { autoOpenOnEmpty?: boolean } = {}) {
  const { data, isLoading } = useGetPayoutAccountsQuery();
  const accounts = data?.data ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PayoutAccount | null>(null);
  const [deleteAccount, { isLoading: deleting }] = useDeletePayoutAccountMutation();
  const [updateAccount] = useUpdatePayoutAccountMutation();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (autoOpenOnEmpty && !isLoading && accounts.length === 0) setAddOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenOnEmpty, isLoading]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id).unwrap();
      toast.success('Payout account removed');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not remove account'));
    }
  };

  const handleMakeDefault = async (id: string) => {
    try {
      await updateAccount({ id, isDefault: true }).unwrap();
      toast.success('Default payout account updated');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not update default account'));
    }
  };

  return (
    <div className="space-y-4">
      {/* A left-aligned section label paired with the "Add" button on the
          same row, rather than the button floating alone flush-right above
          a wide empty gap -- that lone-button layout is what made this tab
          read as visually broken/off-balance. The InfoNote moves to the
          bottom of the page (see below), matching where Grading Schemes
          already puts its own reference notes -- a quiet explainer doesn't
          need top billing above the actual content. */}
      {accounts.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Your bank accounts</p>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add bank account</Button>
        </div>
      )}

      {isLoading ? (
        <Card className="p-5"><Skeleton className="h-32 w-full" /></Card>
      ) : accounts.length === 0 ? (
        // A compact, left-aligned row rather than the big centered
        // EmptyState -- the intro card above the tabs already explains why
        // an account is needed, so a second full hero block here (icon,
        // title, description, button, all vertically centered in a tall
        // box) just restates the same thing and reads as an awkward,
        // sparsely-filled placeholder rather than a normal part of the page.
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Landmark size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No bank account on file yet</p>
              <p className="text-xs text-muted-foreground">Parents and students need somewhere real to pay -- add one to get started.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add bank account</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{a.bankName}</p>
                  <p className="text-sm text-muted-foreground">{a.accountTitle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {a.isDefault ? (
                    <Badge variant="success"><Star size={12} /> Default</Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMakeDefault(a.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditAccount(a)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  A/C: {revealed[a.id] ? a.accountNumber : maskAccountNumber(a.accountNumber)}
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => ({ ...r, [a.id]: !r[a.id] }))}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={revealed[a.id] ? 'Hide account number' : 'Show account number'}
                  >
                    {revealed[a.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </p>
                <p className="font-mono text-xs">{revealed[a.id] ? a.iban : maskAccountNumber(a.iban)}</p>
                {a.branch && <p>Branch: {a.branch}</p>}
                {a.label && a.label !== `${a.bankName} - ${a.branch}` && a.label !== a.bankName && (
                  <p className="mt-1 text-xs italic">{a.label}</p>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" loading={deleting} onClick={() => handleDelete(a.id)}>
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <InfoNote title="Where does the money actually go?">
        <p>
          Marksly never collects or holds fee money. Every challan shows one of these accounts directly, so whoever
          pays -- a parent or the student -- pays your institution's own bank account. Add every account you want to receive fees into, and mark one
          as the default used when a fee structure doesn't specify otherwise.
        </p>
      </InfoNote>

      <AddPayoutAccountDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <EditPayoutAccountDrawer account={editAccount} onClose={() => setEditAccount(null)} />
    </div>
  );
}

/**
 * Fintech-standard default-masked display for account numbers/IBANs shown
 * to admins -- keeps the last 4 characters visible (enough to recognize
 * "yes, that's the right account") while hiding the rest until the admin
 * explicitly clicks to reveal.
 */
function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return '••••'.repeat(Math.ceil((value.length - 4) / 4)) + value.slice(-4);
}

const ibanRegex = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/;
const schema = z.object({
  bankName: z.string().min(2, 'Required'),
  accountTitle: z.string().min(2, 'Required'),
  accountNumber: z.string().min(4, 'Required'),
  iban: z.string().trim().toUpperCase().regex(ibanRegex, 'Enter a valid 24-character Pakistani IBAN'),
  branch: z.string().optional(),
  label: z.string().optional(),
  isDefault: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function AddPayoutAccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createAccount, { isLoading }] = useCreatePayoutAccountMutation();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bankName: '', accountTitle: '', accountNumber: '', iban: '', branch: '', label: '', isDefault: false },
  });
  // These exact details print on every challan a parent or student sees, so the first
  // save of a new account gets one explicit "please double check" stop
  // before it's committed -- cheap insurance against a typo'd IBAN that
  // would otherwise only surface once a payer can't pay.
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  // Deliberately NOT auto-suggested from bank/branch: the card below
  // already prints the bank name and branch right above where this would
  // show, so a "{bank} - {branch}" default just repeats those two lines
  // back verbatim. This field only earns its place on the card when it
  // holds something the other fields don't already say (e.g. "Transport
  // fee account"), so it stays blank until the admin actually wants that.

  const onSubmit = (values: FormValues) => setPendingValues(values);

  const confirmSave = async () => {
    if (!pendingValues) return;
    try {
      await createAccount(pendingValues).unwrap();
      toast.success('Bank account added');
      reset();
      setPendingValues(null);
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not add bank account'));
      setPendingValues(null);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Add Bank Account</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label>Bank</Label>
              <Controller
                control={control}
                name="bankName"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select a bank" /></SelectTrigger>
                    <SelectContent>
                      {PAKISTANI_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.bankName && <p className="mt-1 text-xs text-danger">{errors.bankName.message}</p>}
            </div>
            <div>
              <Label htmlFor="accountTitle">Account title</Label>
              <Input id="accountTitle" placeholder="Exactly as it appears on the bank statement" {...register('accountTitle')} />
              <p className="mt-1 text-xs text-muted-foreground">The account holder's name your bank has on file -- this prints on the challan, so it must match exactly.</p>
              {errors.accountTitle && <p className="mt-1 text-xs text-danger">{errors.accountTitle.message}</p>}
            </div>
            <div>
              <Label htmlFor="accountNumber">Account number</Label>
              <Input id="accountNumber" {...register('accountNumber')} />
              {errors.accountNumber && <p className="mt-1 text-xs text-danger">{errors.accountNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" placeholder="PK36SCBL0000001123456702" className="font-mono" {...register('iban')} />
              <p className="mt-1 text-xs text-muted-foreground">
                Found on your chequebook or bank statement — starts with PK, 24 characters. Ask your bank if you're not sure.
              </p>
              {errors.iban && <p className="mt-1 text-xs text-danger">{errors.iban.message}</p>}
            </div>
            <div>
              <Label htmlFor="branch">Branch (optional)</Label>
              <Input id="branch" placeholder="e.g. Main Boulevard Branch" {...register('branch')} />
            </div>
            <div>
              <Label htmlFor="label">Internal label (optional)</Label>
              <Input id="label" placeholder="e.g. Transport fee account" {...register('label')} />
              <p className="mt-1 text-xs text-muted-foreground">Only if you want a short note to tell this account apart from others in the list below.</p>
              <p className="mt-1 text-xs text-muted-foreground">Just for telling accounts apart in your own list below -- parents/students never see this.</p>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border p-4">
              <input type="checkbox" {...register('isDefault')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
              <span>
                <span className="block text-sm font-medium text-foreground">Make this the default account</span>
                <span className="block text-xs text-muted-foreground">Used on challans unless a fee structure specifies otherwise.</span>
              </span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit">Add account</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    <ConfirmDialog
      open={!!pendingValues}
      onClose={() => setPendingValues(null)}
      onConfirm={confirmSave}
      title="Double check these bank details?"
      description={
        pendingValues ? (
          <>
            This exact text will print on every challan a parent or student sees, so a typo here means they pay the wrong
            place. Please confirm:
            <div className="mt-2 rounded-lg bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">{pendingValues.bankName} — {pendingValues.accountTitle}</p>
              <p className="mt-0.5 text-muted-foreground">A/C {pendingValues.accountNumber}</p>
              <p className="font-mono text-muted-foreground">{pendingValues.iban}</p>
            </div>
          </>
        ) : null
      }
      confirmLabel="Yes, save this account"
      tone="warning"
      loading={isLoading}
      icon={Landmark}
    />
    </>
  );
}

function EditPayoutAccountDrawer({ account, onClose }: { account: PayoutAccount | null; onClose: () => void }) {
  const open = !!account;
  const [updateAccount, { isLoading }] = useUpdatePayoutAccountMutation();
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // "values" (not defaultValues) so switching which account is being
    // edited re-seeds the form from that account's current data, same
    // pattern as StructuresTab.tsx's EditStructureDrawer.
    values: account
      ? {
          bankName: account.bankName,
          accountTitle: account.accountTitle,
          accountNumber: account.accountNumber,
          iban: account.iban,
          branch: account.branch ?? '',
          label: account.label ?? '',
          isDefault: account.isDefault,
        }
      : { bankName: '', accountTitle: '', accountNumber: '', iban: '', branch: '', label: '', isDefault: false },
  });

  const onSubmit = async (values: FormValues) => {
    if (!account) return;
    try {
      await updateAccount({ id: account.id, ...values }).unwrap();
      toast.success('Bank account updated');
      onClose();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not update bank account'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[440px]">
        {account && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">Edit Bank Account</h2>
              <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <Label>Bank</Label>
                <Controller
                  control={control}
                  name="bankName"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select a bank" /></SelectTrigger>
                      <SelectContent>
                        {PAKISTANI_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.bankName && <p className="mt-1 text-xs text-danger">{errors.bankName.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-accountTitle">Account title</Label>
                <Input id="edit-accountTitle" placeholder="Exactly as it appears on the bank statement" {...register('accountTitle')} />
                <p className="mt-1 text-xs text-muted-foreground">The account holder's name your bank has on file -- this prints on the challan, so it must match exactly.</p>
                {errors.accountTitle && <p className="mt-1 text-xs text-danger">{errors.accountTitle.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-accountNumber">Account number</Label>
                <Input id="edit-accountNumber" {...register('accountNumber')} />
                {errors.accountNumber && <p className="mt-1 text-xs text-danger">{errors.accountNumber.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-iban">IBAN</Label>
                <Input id="edit-iban" placeholder="PK36SCBL0000001123456702" className="font-mono" {...register('iban')} />
                {errors.iban && <p className="mt-1 text-xs text-danger">{errors.iban.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-branch">Branch (optional)</Label>
                <Input id="edit-branch" {...register('branch')} />
              </div>
              <div>
                <Label htmlFor="edit-label">Internal label (optional)</Label>
                <Input id="edit-label" placeholder="e.g. Transport fee account" {...register('label')} />
                <p className="mt-1 text-xs text-muted-foreground">Just for telling accounts apart in your own list below -- parents/students never see this.</p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border p-4">
                <input type="checkbox" {...register('isDefault')} className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Make this the default account</span>
                  <span className="block text-xs text-muted-foreground">Used on challans unless a fee structure specifies otherwise.</span>
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                Editing this account changes what future challans show — invoices already generated keep referencing this same account, so its details stay consistent for anyone re-downloading an older slip.
              </p>
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
