'use client';

import { useState } from 'react';
import {
  Mail, Send, CheckCircle2, XCircle, AlertTriangle, RotateCw,
  ChevronLeft, ChevronRight, Info, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateTime } from '@/lib/utils';
import { getErrorMessage, getErrorCode } from '@/lib/get-error-message';
import {
  useGetEmailLogQuery, useGetEmailLogStatsQuery, useGetEmailLogMissingEmailQuery,
  useResendEmailLogMutation,
  type EmailCategory, type EmailStatus, type EmailLogEntry,
} from '@/store/api/emailLogApi';
import { ResendEmailLogDialog } from './ResendEmailLogDialog';

const PAGE_SIZE = 20;

const CATEGORY_TABS: { value: EmailCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'welcome_credentials', label: 'Students & parents' },
  { value: 'invite', label: 'Teachers & staff' },
];

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  welcome_credentials: 'Student / parent login',
  invite: 'Teacher / staff invite',
};

const CATEGORY_MEANING: Record<EmailCategory, string> = {
  welcome_credentials: 'A temporary password so this student or parent can log in — sent the moment you added them.',
  invite: 'An activation link so this teacher/staff/accountant can set their own password — sent the moment you added them.',
};

const STATUS_META: Record<EmailStatus, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string; icon: typeof Send }> = {
  sent: { variant: 'neutral', label: 'Sent', icon: Send },
  delivered: { variant: 'success', label: 'Delivered', icon: CheckCircle2 },
  failed: { variant: 'danger', label: 'Failed', icon: XCircle },
  bounced: { variant: 'danger', label: 'Bounced', icon: AlertTriangle },
};

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  staff: 'Staff',
  accountant: 'Accountant',
};

export function EmailLogView() {
  const [category, setCategory] = useState<EmailCategory | 'all'>('all');
  const [status, setStatus] = useState<EmailStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const [resendTarget, setResendTarget] = useState<EmailLogEntry | null>(null);
  const [domainWarning, setDomainWarning] = useState<string | null>(null);

  const { data: statsRes } = useGetEmailLogStatsQuery();
  const stats = statsRes?.data;

  const { data: missingRes, isLoading: missingLoading } = useGetEmailLogMissingEmailQuery();
  const missingEntries = missingRes?.data ?? [];

  const { data, isLoading, isFetching, isError, refetch } = useGetEmailLogQuery({
    page,
    limit: PAGE_SIZE,
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch || undefined,
  });

  const [resendEmailLog, { isLoading: isResending }] = useResendEmailLogMutation();

  const entries = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const resetFilters = () => {
    setCategory('all');
    setStatus('all');
    setSearch('');
    setPage(1);
  };

  const openResend = (entry: EmailLogEntry) => {
    setDomainWarning(null);
    setResendTarget(entry);
  };

  const confirmResend = async (email: string, confirmUnverifiedEmail?: boolean) => {
    if (!resendTarget) return;
    try {
      const res = await resendEmailLog({ id: resendTarget.id, email, confirmUnverifiedEmail }).unwrap();
      toast.success(res.data.sentTo ? `New email sent to ${res.data.sentTo}` : 'Email resent');
      setResendTarget(null);
      setDomainWarning(null);
    } catch (e: any) {
      if (getErrorCode(e) === 'EMAIL_DOMAIN_UNVERIFIED') {
        setDomainWarning(getErrorMessage(e, "This email domain doesn't look real."));
        return;
      }
      toast.error(getErrorMessage(e, 'Could not resend this email'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login Emails"
        description="Whether the first login email you sent a student, parent, teacher, or staff member actually reached them."
      />

      <Card className="flex items-start gap-2.5 p-4 text-sm">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="text-muted-foreground">
          <p>
            <strong className="text-foreground">Why this page exists:</strong> when you add someone with an email on file, Marksly sends them their login details right away. If that email was mistyped, it can fail silently — you&apos;d have no way of knowing they never got it. This page shows every one of those first emails and whether it actually got through, plus anyone you added with no email at all.
          </p>
          <p className="mt-1.5">
            This only covers that one first email — not password resets or anything else, since those are requested by the person themselves.
          </p>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total sent" value={stats?.total} icon={Mail} />
        <StatCard label="Delivered" value={stats?.delivered} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed / bounced" value={stats ? stats.failed + stats.bounced : undefined} icon={XCircle} tone="danger" />
        <StatCard label="No email on file" value={stats?.missingEmail} icon={UserX} tone="danger" />
      </div>

      {/* Missing-email section — these accounts never even got an attempt,
          so they can't show up in the log below at all. */}
      {(missingLoading || missingEntries.length > 0) && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <UserX size={16} className="text-danger" />
            <h3 className="font-semibold text-foreground">No email on file</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            These people were added without an email address, so they were never sent login details at all. Add an email to their record, then use the resend option to get them logged in.
          </p>
          {missingLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {missingEntries.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{m.name}</span>{' '}
                    <span className="text-muted-foreground">
                      — {ROLE_LABEL[m.role] ?? m.role}
                      {m.role === 'parent' && m.studentNames && m.studentNames.length > 0
                        ? ` of ${m.studentNames.join(', ')}`
                        : ''}
                    </span>
                    {m.phone && <span className="ml-2 text-xs text-muted-foreground" dir="ltr">{m.phone}</span>}
                  </div>
                  <Badge variant="danger">No email</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Category tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setCategory(t.value); setPage(1); }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === t.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.value !== 'all' && stats?.byCategory?.[t.value as EmailCategory] ? (
              <span className="ml-1.5 opacity-70">{stats.byCategory[t.value as EmailCategory]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by recipient or subject…"
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v as EmailStatus | 'all'); setPage(1); }}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isError ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load the email log"
            description="There was a problem reaching the server. Check that the API is running and try again."
            action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
          />
        </Card>
      ) : isLoading ? (
        <LoadingState />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title={debouncedSearch || category !== 'all' || status !== 'all' ? 'No emails match your filters' : 'No login emails sent yet'}
            description={
              debouncedSearch || category !== 'all' || status !== 'all'
                ? 'Try adjusting your search or clearing the filters.'
                : 'As soon as you add a student, parent, teacher, or staff member with an email, it will show up here.'
            }
            action={
              debouncedSearch || category !== 'all' || status !== 'all' ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sent</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const meta = STATUS_META[e.status];
                    const StatusIcon = meta.icon;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground" dir="ltr">{e.to}</p>
                          <p className="max-w-[280px] truncate text-xs text-muted-foreground">{e.subject}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-foreground">{CATEGORY_LABEL[e.category]}</p>
                          <p className="max-w-[220px] text-xs text-muted-foreground">{CATEGORY_MEANING[e.category]}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant} title={e.error ?? undefined}>
                            <StatusIcon size={11} /> {meta.label}
                          </Badge>
                          {e.error && (
                            <p className="mt-1 max-w-[220px] text-xs text-danger" title={e.error}>{e.error}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" onClick={() => openResend(e)}>
                            <RotateCw size={13} /> Resend
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {entries.map((e) => {
              const meta = STATUS_META[e.status];
              const StatusIcon = meta.icon;
              return (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground" dir="ltr">{e.to}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.subject}</p>
                    </div>
                    <Badge variant={meta.variant} className="shrink-0">
                      <StatusIcon size={11} /> {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
                    <span>{CATEGORY_LABEL[e.category]}</span>
                    <span>{formatDateTime(e.createdAt)}</span>
                  </div>
                  {e.error && <p className="mt-1.5 text-xs text-danger">{e.error}</p>}
                  <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => openResend(e)}>
                    <RotateCw size={13} /> Resend
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <ResendEmailLogDialog
        open={!!resendTarget}
        onClose={() => { setResendTarget(null); setDomainWarning(null); }}
        entry={resendTarget}
        loading={isResending}
        onConfirm={confirmResend}
        domainWarning={domainWarning}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value?: number; icon: typeof Mail; tone?: 'success' | 'danger' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon size={14} className={tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-muted-foreground'} />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value ?? <Skeleton className="h-7 w-10" />}</p>
    </Card>
  );
}

function LoadingState() {
  return (
    <TableWrapper className="hidden md:block">
      <div className="divide-y divide-border">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </TableWrapper>
  );
}
