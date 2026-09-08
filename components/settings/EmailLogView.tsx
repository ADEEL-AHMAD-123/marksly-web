'use client';

import { Fragment, useRef, useState } from 'react';
import {
  Mail, Send, CheckCircle2, XCircle, AlertTriangle, RotateCw, Clock,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserX, GraduationCap,
  Users, Briefcase, Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { InfoNote } from '@/components/ui/info-note';
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
import { cn, formatDateTime } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage, getErrorCode } from '@/lib/get-error-message';
import {
  useGetEmailLogQuery, useGetEmailLogStatsQuery, useGetEmailLogMissingEmailQuery,
  useResendEmailLogMutation,
  type EmailCategory, type EmailStatus, type EmailLogEntry, type EmailLogThread,
} from '@/store/api/emailLogApi';
import { ResendEmailLogDialog } from './ResendEmailLogDialog';

const PAGE_SIZE = 20;
const MISSING_PAGE_SIZE = 5;

// The category tabs double as the page's ONLY top-level navigation — "No
// email on file" is a 4th tab rather than a permanently-visible separate
// section, so only ONE content area (the sent-email list, or the missing-
// email list) is ever on screen at once. Two content areas competing for
// attention side by side was a big part of why this page felt crowded.
type View = EmailCategory | 'all' | 'missing';

const VIEW_TABS: { value: View; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'welcome_credentials', label: 'Students & parents' },
  { value: 'invite', label: 'Teachers & staff' },
  { value: 'missing', label: 'No email on file' },
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
  // Transient — a slow-to-arrive send, not a failure yet. A later webhook
  // event upgrades this to Delivered or Bounced once Resend knows the
  // actual outcome (see resend-webhook.service.ts).
  delayed: { variant: 'warning', label: 'Delayed', icon: Clock },
};

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  staff: 'Staff',
  accountant: 'Accountant',
};

const ROLE_ICON: Record<string, typeof GraduationCap> = {
  student: GraduationCap,
  parent: Users,
  teacher: Briefcase,
  staff: Briefcase,
  accountant: Briefcase,
};

export function EmailLogView() {
  const [view, setView] = useState<View>('all');
  const [status, setStatus] = useState<EmailStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const [resendTarget, setResendTarget] = useState<EmailLogThread | null>(null);
  const [domainWarning, setDomainWarning] = useState<string | null>(null);
  const [missingPage, setMissingPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  // Which thread rows currently have their attempt history expanded —
  // keyed by thread id (the headline's id), shared between the desktop
  // table and mobile card layouts so behavior stays identical in both.
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Full error text viewer — a single shared dialog instance rather than
  // one per row, since only one can be open at a time.
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  const category: EmailCategory | 'all' = view === 'missing' ? 'all' : view;

  const { data: statsRes } = useGetEmailLogStatsQuery();
  const stats = statsRes?.data;
  const problemCount = stats ? stats.failed + stats.bounced : 0;

  const { data: missingRes, isLoading: missingLoading } = useGetEmailLogMissingEmailQuery();
  const missingEntries = missingRes?.data ?? [];
  const missingTotalPages = Math.max(1, Math.ceil(missingEntries.length / MISSING_PAGE_SIZE));
  // Clamp rather than read missingPage directly — once an admin fixes an
  // account's email, this list shrinks on refetch and a page number that
  // was valid a moment ago can now be past the end.
  const currentMissingPage = Math.min(missingPage, missingTotalPages);
  const missingPageEntries = missingEntries.slice(
    (currentMissingPage - 1) * MISSING_PAGE_SIZE,
    currentMissingPage * MISSING_PAGE_SIZE
  );

  // Both jump handlers switch tabs to the exact view the admin wants next,
  // rather than leaving them to notice/scroll to a separate always-on
  // section — the alert banner below is the only "where's the problem?"
  // entry point now, so it needs to fully hand off to the right tab.
  const jumpToMissingEmail = () => {
    setView('missing');
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const jumpToProblems = () => {
    setView('all');
    setStatus('all');
    setPage(1);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const { data, isLoading, isFetching, isError, refetch } = useGetEmailLogQuery(
    {
      page,
      limit: PAGE_SIZE,
      category: category === 'all' ? undefined : category,
      status: status === 'all' ? undefined : status,
      search: debouncedSearch || undefined,
    },
    { skip: view === 'missing' }
  );

  const [resendEmailLog, { isLoading: isResending }] = useResendEmailLogMutation();

  const entries = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const filtersActive = !!debouncedSearch || status !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  const openResend = (entry: EmailLogThread) => {
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
    <div ref={topRef} className="scroll-mt-4 space-y-5">
      <PageHeader
        title="Login Emails"
        description="Whether the first login email you sent actually reached the person."
      />

      {/* Same collapsed-by-default explainer pattern used on the
          Students/Teachers/Staff pages (components/ui/info-note.tsx) —
          one consistent reference instead of a bespoke permanently-open
          explainer card. This page is about delivery status of the FIRST
          login email, not about how to log in — hence a page-specific
          title rather than the (removed) generic "How do they log in?"
          default that used to show here by mistake. */}
      <InfoNote title="What is this page for?">
        <p>When you add a student, parent, teacher, or staff member with an email on file, Marksly sends their login details right away — a temporary password for students/parents, an activation link for teachers/staff. This page shows whether that first email actually reached them.</p>
        <p>It only covers that one first email — not password resets or anything else, since those are requested by the person themselves.</p>
      </InfoNote>

      {/* Needs-attention banner — the single, unmissable entry point for
          anything actually wrong. Nothing renders here at all when
          everything's fine, instead of a permanent wall of stat cards an
          admin has to scan every time just to confirm there's no problem. */}
      {(problemCount > 0 || missingEntries.length > 0) && (
        <div className="space-y-2.5">
          {problemCount > 0 && (
            <AlertRow
              tone="danger"
              icon={XCircle}
              title={problemCount === 1 ? '1 email failed to deliver' : `${problemCount} emails failed to deliver`}
              description="These people may not know they have an account — check the address on file and resend."
              ctaLabel="Review"
              onClick={jumpToProblems}
            />
          )}
          {missingEntries.length > 0 && (
            <AlertRow
              tone="danger"
              icon={UserX}
              title={missingEntries.length === 1 ? '1 person has no email on file' : `${missingEntries.length} people have no email on file`}
              description="They were never sent login details at all — add an email to their record to send it."
              ctaLabel="Review"
              onClick={jumpToMissingEmail}
            />
          )}
        </div>
      )}

      {/* Overview — informational, not actionable, so deliberately quieter
          than the banner above: small inline numbers rather than big
          cards, nothing to click. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-0.5 text-sm text-muted-foreground">
        <OverviewStat label="Total sent" value={stats?.total} />
        <span className="text-border">·</span>
        <OverviewStat label="Delivered" value={stats?.delivered} tone="success" />
        {(stats?.delayed ?? 0) > 0 && (
          <>
            <span className="text-border">·</span>
            <OverviewStat label="Delayed" value={stats?.delayed} tone="warning" />
          </>
        )}
      </div>

      {/* Tabs — the page's one and only navigation control. Inactive tabs
          get a real border + solid foreground text (not washed-out muted
          text on muted background, which was hard to read at a glance),
          and each count sits in its own small pill with real contrast
          rather than semi-transparent text. */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VIEW_TABS.map((t) => {
          const count =
            t.value === 'missing'
              ? missingEntries.length
              : t.value !== 'all'
                ? stats?.byCategory?.[t.value as EmailCategory]
                : undefined;
          const active = view === t.value;
          return (
            <button
              key={t.value}
              onClick={() => { setView(t.value); setPage(1); }}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted'
              )}
            >
              {t.label}
              {!!count && (
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-none',
                    active ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {view === 'missing' ? (
        <MissingEmailPanel
          loading={missingLoading}
          entries={missingPageEntries}
          total={missingEntries.length}
          page={currentMissingPage}
          totalPages={missingTotalPages}
          onPrev={() => setMissingPage((p) => Math.max(1, p - 1))}
          onNext={() => setMissingPage((p) => Math.min(missingTotalPages, p + 1))}
        />
      ) : (
        <>
          {/* Search + status live in the same row as each other, right
              above the list they filter — one compact toolbar instead of
              a separate card. */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
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
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                title={filtersActive ? 'No emails match your filters' : 'No login emails sent yet'}
                description={
                  filtersActive
                    ? 'Try adjusting your search or clearing the filters.'
                    : 'As soon as you add a student, parent, teacher, or staff member with an email, it will show up here.'
                }
                action={filtersActive ? <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button> : undefined}
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
                        const isOpen = expandedThreads.has(e.id);
                        const hasHistory = e.attemptCount > 1;
                        return (
                          <Fragment key={e.id}>
                            <TableRow>
                              <TableCell className="whitespace-nowrap">{formatDateTime(e.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-foreground" dir="ltr">{e.to}</p>
                                  {e.isResend && (
                                    <Badge
                                      variant="neutral"
                                      className="shrink-0"
                                      title="Sent from a Resend action, not the original signup — a second row for this person is expected."
                                    >
                                      Resent
                                    </Badge>
                                  )}
                                </div>
                                <p className="max-w-[280px] truncate text-xs text-muted-foreground">{e.subject}</p>
                              </TableCell>
                              <TableCell title={CATEGORY_MEANING[e.category]}>
                                <p className="text-foreground">{CATEGORY_LABEL[e.category]}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant={meta.variant}>
                                    <StatusIcon size={11} /> {meta.label}
                                  </Badge>
                                  {hasHistory && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(e.id)}
                                      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                                    >
                                      {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                      {e.attemptCount} attempts
                                    </button>
                                  )}
                                </div>
                                {e.error && (
                                  <button
                                    type="button"
                                    onClick={() => setErrorDialog(e.error)}
                                    className="mt-1 block max-w-[220px] truncate text-left text-xs text-danger underline decoration-dotted underline-offset-2 hover:text-danger/80"
                                  >
                                    {e.error}
                                  </button>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="secondary" size="sm" onClick={() => openResend(e)}>
                                  <RotateCw size={13} /> Resend
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isOpen && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="bg-muted/30 py-2">
                                  <AttemptHistoryList history={e.history} onShowError={setErrorDialog} />
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
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
                  const isOpen = expandedThreads.has(e.id);
                  const hasHistory = e.attemptCount > 1;
                  return (
                    <Card key={e.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate font-medium text-foreground" dir="ltr">{e.to}</p>
                            {e.isResend && <Badge variant="neutral" className="shrink-0">Resent</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{e.subject}</p>
                        </div>
                        <Badge variant={meta.variant} className="shrink-0">
                          <StatusIcon size={11} /> {meta.label}
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                        <span>{CATEGORY_LABEL[e.category]}</span>
                        <span>{formatDateTime(e.createdAt)}</span>
                      </div>
                      {hasHistory && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(e.id)}
                          className="mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                        >
                          {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          {e.attemptCount} attempts
                        </button>
                      )}
                      {e.error && (
                        <button
                          type="button"
                          onClick={() => setErrorDialog(e.error)}
                          className="mt-1.5 block w-full truncate text-left text-xs text-danger underline decoration-dotted underline-offset-2"
                        >
                          {e.error}
                        </button>
                      )}
                      {isOpen && (
                        <div className="mt-2.5 border-t border-border pt-2.5">
                          <AttemptHistoryList history={e.history} onShowError={setErrorDialog} />
                        </div>
                      )}
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
        </>
      )}

      <ResendEmailLogDialog
        open={!!resendTarget}
        onClose={() => { setResendTarget(null); setDomainWarning(null); }}
        entry={resendTarget}
        loading={isResending}
        onConfirm={confirmResend}
        domainWarning={domainWarning}
      />

      <ErrorMessageDialog error={errorDialog} onClose={() => setErrorDialog(null)} />
    </div>
  );
}

/** Older attempts for a thread, shown newest-first underneath the headline
 *  row once expanded — same info (timestamp / status / error) as the
 *  headline itself, just for past sends the admin doesn't need by default. */
function AttemptHistoryList({
  history, onShowError,
}: {
  history: EmailLogEntry[];
  onShowError: (error: string) => void;
}) {
  if (history.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {history.map((h) => {
        const meta = STATUS_META[h.status];
        const StatusIcon = meta.icon;
        return (
          <li key={h.id} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(h.createdAt)}</span>
            <Badge variant={meta.variant}>
              <StatusIcon size={10} /> {meta.label}
            </Badge>
            {h.error && (
              <button
                type="button"
                onClick={() => onShowError(h.error!)}
                className="truncate text-danger underline decoration-dotted underline-offset-2 hover:text-danger/80"
              >
                {h.error}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Full-text viewer for a truncated error message — replaces the old
 *  single-line `truncate` + hover-`title` pattern (useless on touch
 *  devices) with a real dialog, same @radix-ui/react-dialog primitive
 *  already used by ResendEmailLogDialog on this page, plus a copy button
 *  since admins often need to paste this into a support request. */
function ErrorMessageDialog({ error, onClose }: { error: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — select the text manually.');
    }
  };

  return (
    <DialogPrimitive.Root open={!!error} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle size={16} />
            </span>
            <DialogPrimitive.Title className="text-base font-semibold">Delivery error</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="sr-only">The full error message returned for this email attempt.</DialogPrimitive.Description>
          <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground" dir="ltr">
            {error}
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" onClick={onClose}>Close</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A single row in the "needs attention" banner — same visual language as
 *  the dashboard's own DashboardAlertBanner (colored icon chip, title +
 *  one-line description, a single CTA button) so an admin who's already
 *  learned that pattern on the dashboard recognizes it here immediately. */
function AlertRow({
  tone, icon: Icon, title, description, ctaLabel, onClick,
}: {
  tone: 'danger' | 'warning';
  icon: typeof XCircle;
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 sm:items-center',
        tone === 'danger' ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'
      )}
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card sm:mt-0', tone === 'danger' ? 'text-danger' : 'text-warning')}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-inset ring-border transition-colors hover:bg-muted"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function OverviewStat({ label, value, tone }: { label: string; value?: number; tone?: 'success' | 'warning' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('font-semibold', tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-foreground')}>
        {value ?? '—'}
      </span>
      {label}
    </span>
  );
}

interface MissingEmailEntry {
  userId: string;
  name: string;
  role: string;
  phone: string | null;
  studentNames?: string[];
}

function MissingEmailPanel({
  loading, entries, total, page, totalPages, onPrev, onNext,
}: {
  loading: boolean;
  entries: MissingEmailEntry[];
  total: number;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={CheckCircle2}
          title="Everyone has an email on file"
          description="Nobody's login details are stuck waiting on a missing address."
        />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">
        These people were added without an email address, so they were never sent login details at all. Students never have their own email — for a student&apos;s family, add an email to the parent/guardian on the Students page; for a teacher, staff member, or accountant, add one to their own record. A &quot;resend login&quot; option will appear there once you do.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {entries.map((m) => {
          const RoleIcon = ROLE_ICON[m.role] ?? Users;
          return (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <RoleIcon size={13} />
                </span>
                <div>
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[m.role] ?? m.role}
                    {m.role === 'parent' && m.studentNames && m.studentNames.length > 0
                      ? ` of ${m.studentNames.join(', ')}`
                      : ''}
                    {m.phone && <span dir="ltr"> · {m.phone}</span>}
                  </p>
                </div>
              </div>
              <Badge variant="danger">No email</Badge>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon" disabled={page <= 1} onClick={onPrev} aria-label="Previous page">
              <ChevronLeft size={16} />
            </Button>
            <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={onNext} aria-label="Next page">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
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
