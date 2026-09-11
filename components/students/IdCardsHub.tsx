'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GraduationCap, Users, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoNote } from '@/components/ui/info-note';
import { IdCardsView } from './IdCardsView';
import { StaffIdCardsView } from '@/components/staff/StaffIdCardsView';
import { IdCardSettingsDrawer } from './IdCardSettingsDrawer';

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

  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ID Cards"
        description="Generate and print verifiable, QR-scannable ID cards for students and staff."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={15} /> Card settings
          </Button>
        }
      />
      <IdCardSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Tabs key={initialTab} defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5"><GraduationCap size={15} /> Students</TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5"><Users size={15} /> Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="students"><IdCardsView /></TabsContent>
        <TabsContent value="staff"><StaffIdCardsView /></TabsContent>
      </Tabs>

      {/* Help — placed after the actual tool, same pattern as Students/
          Staff's own InfoNotes, not before it. Split into three focused
          questions rather than one long note, each answering one thing an
          admin is likely looking for on its own. */}
      <div className="space-y-2">
        <InfoNote title="Someone missing from a list here?">
          <p>
            Everyone active shows up in the list below, even with incomplete info — a small warning dot on their
            avatar means something&apos;s still missing. Look them up on the Students or Staff page instead for the
            full list of what&apos;s missing and to fix it directly.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <Link href="/admin/students" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Go to Students <ArrowRight size={12} />
            </Link>
            <Link href="/admin/staff" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Go to Staff <ArrowRight size={12} />
            </Link>
          </div>
        </InfoNote>
        <InfoNote title="How do I set what shows on every card?">
          <p>
            Use <strong>Card settings</strong> above to choose what shows on every card (Form B/CNIC, blood group,
            institute name) and how long a card stays valid before it needs reissuing.
          </p>
        </InfoNote>
        <InfoNote title="Need to fix, renew, or print more than one card?">
          <p>
            Need to fix one person&apos;s card — their Form B/CNIC number, blood group, or issue/expiry dates? Select
            them below and use <strong>Edit card details</strong>. To renew a whole class, section, or staff role at
            once, use <strong>Re-issue cards</strong> instead of editing one by one. Need to print several cards in
            one go instead of one at a time? Use <strong>Print all</strong> — it lays every active person&apos;s card
            out on one printable sheet (front side only).
          </p>
        </InfoNote>
      </div>
    </div>
  );
}
