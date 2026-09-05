'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
