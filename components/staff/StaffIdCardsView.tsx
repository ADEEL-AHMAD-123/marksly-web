'use client';

import { memo, useMemo } from 'react';
import Image from 'next/image';
import { Printer, CreditCard as IdCardIcon, GraduationCap, Briefcase, Landmark, ShieldCheck, BookOpen, ImageOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { QRCode } from '@/components/ui/qr-code';
import { useGetStaffIdCardsQuery, type StaffCardRole, type StaffIdCard } from '@/store/api/usersApi';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM, ID_CARD_PRINT_CSS } from '@/components/shared/idCardPrint';
import { IdCardCredit } from '@/components/shared/IdCardCredit';
import { IdCardReadinessBanner } from '@/components/shared/IdCardReadinessBanner';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const ROLE_FILTERS: { value: StaffCardRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'admin', label: 'Admin' },
];

// A role-appropriate accent — distinct from student cards (which use
// primary/accent) so staff cards are visually distinguishable from a
// student's at a glance while remaining part of the same design system
// (all four are already-used semantic tokens, not new arbitrary colors).
const ROLE_STYLE: Record<StaffCardRole, { accent: string; band: string; soft: string; icon: typeof Briefcase; label: string }> = {
  teacher: { accent: 'border-accent', band: 'bg-accent text-accent-foreground', soft: 'bg-accent/15 text-accent-foreground', icon: BookOpen, label: 'Teacher' },
  staff: { accent: 'border-success', band: 'bg-success text-success-foreground', soft: 'bg-success-soft text-success', icon: Briefcase, label: 'Staff' },
  accountant: { accent: 'border-warning', band: 'bg-warning text-warning-foreground', soft: 'bg-warning-soft text-warning', icon: Landmark, label: 'Accountant' },
  admin: { accent: 'border-danger', band: 'bg-danger text-danger-foreground', soft: 'bg-danger-soft text-danger', icon: ShieldCheck, label: 'Admin' },
};

export function StaffIdCardsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const roleParam = (searchParams.get('role') as StaffCardRole | null) ?? 'all';

  const { data, isFetching } = useGetStaffIdCardsQuery(roleParam === 'all' ? undefined : { role: roleParam });
  const sheet = data?.data;
  const staff = useMemo(() => sheet?.staff ?? [], [sheet]);

  const setRole = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete('role');
    else params.set('role', value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ID_CARD_PRINT_CSS }} />

      {staff.length > 0 && (
        <div className="no-print flex justify-end">
          <Button size="sm" onClick={() => window.print()}><Printer size={16} /> Print {staff.length} cards</Button>
        </div>
      )}

      <Card className="p-4 no-print">
        <div className="max-w-xs">
          <Label>Role</Label>
          <Select value={roleParam} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isFetching && staff.length === 0 ? (
        <Card className="p-5 no-print"><Skeleton className="h-64 w-full" /></Card>
      ) : staff.length === 0 ? (
        <Card className="no-print"><EmptyState icon={IdCardIcon} title="No staff found" description="No active members match this role yet." /></Card>
      ) : (
        <>
          <IdCardReadinessBanner
            people={staff.map((s) => ({
              id: s.id,
              userId: s.id,
              name: s.name,
              profilePhoto: s.profilePhoto,
              context: ROLE_STYLE[s.role]?.label ?? s.role,
            }))}
            personLabel="staff member"
            institutionLogoUrl={sheet!.institution.logoUrl}
          />
          <div id="id-card-print" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {staff.map((s) => (
              <StaffIdCardItem key={s.id} member={s} institution={sheet!.institution} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const StaffIdCardItem = memo(function StaffIdCardItem({
  member, institution,
}: {
  member: StaffIdCard;
  institution: { name: string; logoUrl: string | null };
}) {
  const [first = '', last = ''] = member.name.split(' ');
  const style = ROLE_STYLE[member.role] ?? ROLE_STYLE.staff;
  const RoleIcon = style.icon;

  return (
    <div
      className={cn(
        'id-card mx-auto flex w-full flex-col overflow-hidden rounded-xl border-2 bg-card shadow-sm',
        style.accent
      )}
      style={{ aspectRatio: `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`, maxWidth: 380 }}
    >
      {/* Header band — same institution-branding placement as student
          cards, just tinted with this role's accent instead of primary. */}
      <div className={cn('flex items-center gap-2 px-3 py-1.5', style.band)}>
        {institution.logoUrl ? (
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white/10">
            <Image src={institution.logoUrl} alt="" fill sizes="28px" className="object-contain" unoptimized />
          </div>
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
            <GraduationCap size={17} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight">{institution.name}</p>
          <p className="text-[8.5px] font-medium uppercase leading-tight tracking-wide opacity-80">
            Staff Identity Card
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-2.5 p-2.5">
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2">
            {member.profilePhoto ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border">
                <Image src={member.profilePhoto} alt="" fill sizes="40px" className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="relative shrink-0">
                <Avatar initials={`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()} size="md" />
                <span
                  title="No photo on file"
                  className="no-print absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-card bg-warning text-warning-foreground"
                >
                  <ImageOff size={8} />
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-tight text-foreground">{member.name}</p>
              <span className={cn('mt-0.5 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-wide', style.soft)}>
                <RoleIcon size={8} /> {style.label}
              </span>
            </div>
          </div>

          <dl className="mt-0.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[9.5px] leading-tight">
            <Field label="Staff ID" value={member.systemId} />
            {member.subjectCount != null && (
              <Field label="Subjects Taught" value={String(member.subjectCount)} />
            )}
          </dl>

          <div className="mt-auto pt-0.5">
            <IdCardCredit />
          </div>
        </div>

        {/* QR side panel — same sizing/mechanics as student cards */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border pl-2.5">
          <QRCode value={member.qr} size={76} />
          <p className="text-center text-[6.5px] leading-tight text-muted-foreground">Scan to verify</p>
        </div>
      </div>
    </div>
  );
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold text-foreground">{value}</dd>
    </div>
  );
}
