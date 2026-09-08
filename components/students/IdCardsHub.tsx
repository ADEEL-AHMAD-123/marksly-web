'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoginInfoNote } from '@/components/ui/login-info-note';
import { IdCardsView } from './IdCardsView';
import { StaffIdCardsView } from '@/components/staff/StaffIdCardsView';

// Students and staff ID cards used to be two entirely separate sidebar
// items ("ID Cards" and "Staff ID Cards"), placed apart from each other with
// Teachers/Staff in between — same feature (pick a group, print QR-verified
// cards), split into two unrelated-looking nav entries with no visual link
// between them. Merged into one page with tabs so the relationship is
// obvious and the sidebar has one less near-duplicate entry.
export function IdCardsHub() {
  // Deep-linkable via ?tab=staff (e.g. from a future "Staff" page shortcut)
  // — read via window.location.search instead of useSearchParams to avoid
  // that hook's Suspense-boundary requirement, same pattern as
  // SettingsView's tab param.
  const [initialTab, setInitialTab] = useState('students');
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'staff') setInitialTab('staff');
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ID Cards"
        description="Generate and print verifiable, QR-scannable ID cards for students and staff."
      />

      <LoginInfoNote title="Why can't I get a card yet?">
        <p>
          A card only appears once every required detail is on file — address and phone for staff, and address,
          blood group and phone for students. If something&apos;s missing, it just means nobody&apos;s filled it in yet.
        </p>
        <p>
          Anyone can fill in their own details from their <strong>My ID Card</strong> page (visible to every role
          except admin) — or you can fill it in for them here: select their name, then use{' '}
          <strong>Edit</strong> on their record to add what&apos;s missing.
        </p>
        <p>
          Use the <strong>Missing ID info</strong> filter on the Students or Staff page to find everyone who still
          needs something, without opening each record one at a time.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <Link href="/admin/students" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Go to Students <ArrowRight size={12} />
          </Link>
          <Link href="/admin/staff" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Go to Staff <ArrowRight size={12} />
          </Link>
        </div>
      </LoginInfoNote>

      <Tabs key={initialTab} defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5"><GraduationCap size={15} /> Students</TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5"><Users size={15} /> Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="students"><IdCardsView /></TabsContent>
        <TabsContent value="staff"><StaffIdCardsView /></TabsContent>
      </Tabs>
    </div>
  );
}
