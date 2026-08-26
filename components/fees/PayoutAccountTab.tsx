'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useGetPayoutAccountQuery, useSavePayoutAccountMutation, type PayoutMethod,
} from '@/store/api/feesOnlineApi';

export function PayoutAccountTab() {
  const { data, isLoading } = useGetPayoutAccountQuery();
  const [save, { isLoading: saving }] = useSavePayoutAccountMutation();
  const account = data?.data;

  const [method, setMethod] = useState<PayoutMethod>('bank');
  const [accountTitle, setAccountTitle] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [walletNumber, setWalletNumber] = useState('');

  useEffect(() => {
    if (account) {
      setMethod(account.method);
      setAccountTitle(account.accountTitle);
      setBankName(account.bankName ?? '');
      setAccountNumber(account.accountNumber ?? '');
      setIban(account.iban ?? '');
      setWalletNumber(account.walletNumber ?? '');
    }
  }, [account]);

  const handleSave = async () => {
    if (!accountTitle.trim()) return toast.error('Enter the account title');
    try {
      await save({
        method,
        accountTitle: accountTitle.trim(),
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        iban: iban.trim() || undefined,
        walletNumber: walletNumber.trim() || undefined,
      }).unwrap();
      toast.success('Payout account saved — Marksly will verify it before the first payout');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save payout account');
    }
  };

  if (isLoading) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;

  return (
    <Card className="max-w-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Landmark size={18} />
          </span>
          <div>
            <p className="font-semibold text-foreground">Online fee payout account</p>
            <p className="text-xs text-muted-foreground">Where Marksly sends the money collected from parents paying online.</p>
          </div>
        </div>
        {account && (
          account.verified ? (
            <Badge variant="success"><CheckCircle2 size={12} className="mr-1" /> Verified</Badge>
          ) : (
            <Badge variant="warning"><Clock size={12} className="mr-1" /> Pending verification</Badge>
          )
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label>Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PayoutMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">Bank transfer</SelectItem>
              <SelectItem value="jazzcash">JazzCash</SelectItem>
              <SelectItem value="easypaisa">EasyPaisa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="accountTitle">Account title</Label>
          <Input id="accountTitle" value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} placeholder="e.g. Fazaia Grammar School" />
        </div>

        {method === 'bank' ? (
          <>
            <div>
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account number</Label>
              <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="iban">IBAN (optional)</Label>
              <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value)} />
            </div>
          </>
        ) : (
          <div>
            <Label htmlFor="walletNumber">{method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} number</Label>
            <Input id="walletNumber" value={walletNumber} onChange={(e) => setWalletNumber(e.target.value)} placeholder="03XXXXXXXXX" />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Changing these details resets verification — Marksly re-confirms the account before your next payout goes out.
        </p>

        <Button onClick={handleSave} loading={saving}>Save payout account</Button>
      </div>
    </Card>
  );
}
