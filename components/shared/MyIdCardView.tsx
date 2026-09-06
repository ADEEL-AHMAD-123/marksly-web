'use client';

import { useState } from 'react';
import { Printer, CreditCard as IdCardIcon, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppSelector } from '@/store/hooks';
import { useGetMyCardQuery, useUpdateMyContactMutation } from '@/store/api/usersApi';
import { useGetMyStudentCardQuery, useUpdateMyStudentContactMutation } from '@/store/api/studentsApi';
import { ID_CARD_PRINT_CSS } from '@/components/shared/idCardPrint';
import { StaffIdCardItem } from '@/components/staff/StaffIdCardsView';
import { IdCardItem } from '@/components/students/IdCardsView';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Self-service "My ID Card" page — for every role except admin/superadmin/
 * parent (see SidebarNav.tsx for the nav-link gating). Shows nothing until
 * the account's own required fields are filled in (same "no card before
 * complete info" principle as the admin bulk views), then renders the exact
 * same printable card component the admin's own ID Cards page uses.
 */
export function MyIdCardView() {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role;

  if (role === 'student') return <StudentMyIdCard />;
  if (role === 'teacher' || role === 'staff' || role === 'accountant' || role === 'admin') {
    return <StaffMyIdCard />;
  }
  return (
    <div className="space-y-6">
      <PageHeader title="My ID Card" description="Your printable identity card." />
      <Card><EmptyState icon={IdCardIcon} title="Not available for this account" description="This account type doesn't have its own ID card." /></Card>
    </div>
  );
}

function StaffMyIdCard() {
  const { data, isFetching, isError } = useGetMyCardQuery();
  const card = data?.data;
  const [updateContact, { isLoading: saving }] = useUpdateMyContactMutation();
  const [address, setAddress] = useState('');

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />
      <PageHeader title="My ID Card" description="Your printable staff identity card." />

      {isFetching ? (
        <Card className="p-5 no-print"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : isError || !card ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Couldn't load your card" description="Try refreshing the page." /></Card>
      ) : card.missing.length > 0 ? (
        <Card className="max-w-sm space-y-3 p-4 no-print">
          <p className="text-sm text-muted-foreground">
            Add your address to generate your ID card.
          </p>
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
          </div>
          <Button
            size="sm"
            disabled={!address.trim() || saving}
            onClick={() => updateContact({ address: address.trim() })}
          >
            {saving ? 'Saving…' : 'Save & continue'}
          </Button>
        </Card>
      ) : (
        <>
          <div className="no-print flex justify-end">
            <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print my card</Button>
          </div>
          <div id="id-card-print" className="flex justify-center">
            <div className="w-full max-w-sm">
              <StaffIdCardItem member={card} institution={card.institution} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StudentMyIdCard() {
  const { data, isFetching, isError } = useGetMyStudentCardQuery();
  const card = data?.data;
  const [updateContact, { isLoading: saving }] = useUpdateMyStudentContactMutation();
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />
      <PageHeader title="My ID Card" description="Your printable student identity card." />

      {isFetching ? (
        <Card className="p-5 no-print"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></Card>
      ) : isError || !card ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="Couldn't load your card" description="Try refreshing the page." /></Card>
      ) : card.missing.length > 0 ? (
        <Card className="max-w-sm space-y-3 p-4 no-print">
          <p className="text-sm text-muted-foreground">
            A few more details are needed before your ID card is ready.
          </p>
          {card.missing.includes('address') && (
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House #, street, area" />
            </div>
          )}
          {card.missing.includes('bloodGroup') && (
            <div>
              <Label>Blood Group</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <Button
            size="sm"
            disabled={saving || (card.missing.includes('address') && !address.trim()) || (card.missing.includes('bloodGroup') && !bloodGroup)}
            onClick={() => updateContact({
              ...(card.missing.includes('address') ? { address: address.trim() } : {}),
              ...(card.missing.includes('bloodGroup') ? { bloodGroup } : {}),
            })}
          >
            {saving ? 'Saving…' : 'Save & continue'}
          </Button>
        </Card>
      ) : (
        <>
          <div className="no-print flex justify-end">
            <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print my card</Button>
          </div>
          <div id="id-card-print" className="flex justify-center">
            <div className="w-full max-w-sm">
              <IdCardItem
                student={card}
                institution={card.institution}
                className={card.className}
                section={card.section}
                termName={card.termName}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
