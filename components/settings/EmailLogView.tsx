'use client';

import { useState } from 'react';
import {
  Mail, Send, CheckCircle2, XCircle, AlertTriangle, RotateCw,
  ChevronLeft, ChevronRight, Info,
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
import { getErrorMessage } from '@/lib/get-error-message';
import {
  useGetEmailLogQuery, useGetEmailLogStatsQuery, useResendEmailLogMutation,
  type EmailCategory, type EmailStatus, type EmailLogEntry,
} from '@/store/api/emailLogApi';

const PAGE_SIZE = 20;

// Only categories that can ever carry an institutionId (see the backend
// model's comment) — 'contact_form'/'platform_alert' never do, so they'd
// never appear here anyway; omitted from the tabs so there's no dead filter
// option sitting there.
const CATEGORY_TABS: { value: EmailCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'welcome_credentials', label: 'Welcome / credentials' },
  { value: 'invite', label: 'Staff invites' },
  { value: 'verification', label: 'Email verification' },
  { value: 'password_reset', label: 'Password reset' },
  { value: 'email_change', label: 'Email change' },
  { value: 'billing', label: 'Billing' },
];

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  welcome_credentials: 'Welcome / credentials',
  invite: 'Staff invite',
  verification: 'Email verification',
  password_reset: 'Password reset',
  email_change: 'Email change',
  billing: 'Billing',
  contact_form: 'Contact form',
  platform_alert: 'Platform alert',
};

// What each category actually IS, in plain language — this is the whole
// point of the page per the admin's own request: not just a list of
// subject lines, but "what is this, and why does it matter". Shown as the
// description under each row's category badge.
const CATEGORY_MEANING: Record<EmailCategory, string> = {
  welcome_credentials: 'A temporary password for a new student, parent, or staff account created with an explicit password.',
  invite: 'An activation link for a newly-added teacher/staff/accountant — they set their own password by clicking it.',
  verification: 'Confirms a self-registered admin owns the email they signed up with.',
  password_reset: 'A "Forgot password" link someone requested.',
  email_change: 'Confirms a request to change the email address on an account.',
  billing: 'A payment receipt or a renewal/payment-failure notice for this institution\'s subscription.',
  contact_form: 'A marketing-site contact form submission.',
  platform_alert: 'An internal alert to the Marksly platform team — not sent to anyone at this institution.',
};

const STATUS_META: Record<EmailStatus, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string; icon: typeof Send }> = {
  sent: { variant: 'neutral', label: 'Sent', icon: Send },
  delivered: { variant: 'success', label: 'Delivered', icon: CheckCircle2 },
  failed: { variant: 'danger', label: 'Failed', icon: XCircle },
  bounced: { variant: 'danger', label: 'Bounced', icon: AlertTriangle },
};

// Categories resend.ts (the backend service) actually knows how to act on —
// kept in sync manually rather than always showing the button and letting
// the request 400; this way a category with no real resend path doesn't
// even tempt the admin to click it.
const RESENDABLE: Set<EmailCategory> = new Set(['invite', 'welcome_credentials', 'verification', 'password_reset']);

export function EmailLogView() {
  const [category, setCategory] = useState<EmailCategory | 'all'>('all');
  const [status, setStatus] = useState<EmailStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: statsRes } = useGetEmailLogStatsQuery();
  const stats = statsRes?.data;

  const { data, isLoading, isFetching, isError, refetch } = useGetEmailLogQuery({
    page,
    limit: PAGE_SIZE,
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch || undefined,
  });

  const [resendEmailLog] = useResendEmailLogMutation();

  const entries = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const resetFilters = () => {
    setCategory('all');
    setStatus('all');
    setSearch('');
    setPage(1);
  };

  const onResend = async (entry: EmailLogEntry) => {
    setResendingId(entry.id);
    try {
      const res = await resendEmailLog(entry.id).unwrap();
      toast.success(res.data.sentTo ? `New email sent to ${res.data.sentTo}` : 'Email resent');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not resend this email'));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Log"
        description="Every email Marksly has sent for your institution, whether it actually went through, and why not when it didn't."
      />

      <Card className="flex items-start gap-2.5 p-4 text-sm">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="text-muted-foreground">
          <p>
            <strong className="text-foreground">What this is:</strong> a record of every login-credential, invite, verification, password-reset, and billing email sent on behalf of your institution — not what&apos;s in each email, just whether it was accepted by the mail provider, and later, whether it was actually delivered or bounced.
          </p>
          <p className="mt-1.5">
            <strong className="text-foreground">&quot;Sent&quot; vs &quot;Delivered&quot;:</strong> &quot;Sent&quot; only means our email provider accepted the request — it can still bounce or land in spam afterward with no error at send time. &quot;Delivered&quot;/&quot;Bounced&quot; are a more reliable, later signal once the provider actually knows what happened at the recipient&apos;s mailbox.
          </p>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats?.total} icon={Mail} />
        <StatCard label="Delivered" value={stats?.delivered} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={stats?.failed} icon={XCircle} tone="danger" />
        <StatCard label="Bounced" value={stats?.bounced} icon={AlertTriangle} tone="danger" />
      </div>

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
            title={debouncedSearch || category !== 'all' || status !== 'all' ? 'No emails match your filters' : 'No emails sent yet'}
            description={
              debouncedSearch || category !== 'all' || status !== 'all'
                ? 'Try adjusting your search or clearing the filters.'
                : 'As soon as Marksly sends an email for your institution, it will show up here.'
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
                          {RESENDABLE.has(e.category) ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={resendingId === e.id}
                              disabled={resendingId !== null}
                              onClick={() => onResend(e)}
                            >
                              <RotateCw size={13} /> Resend
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
                  {RESENDABLE.has(e.category) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 w-full"
                      loading={resendingId === e.id}
                      disabled={resendingId !== null}
                      onClick={() => onResend(e)}
                    >
                      <RotateCw size={13} /> Resend
                    </Button>
                  )}
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
