'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Sparkles, Bell, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetInstitutionsQuery } from '@/store/api/superadminApi';
import { useGetAnnouncementsQuery, useCreateAnnouncementMutation } from '@/store/api/superadminApi';

const priorityBadge: Record<string, { variant: 'neutral' | 'primary' | 'warning' | 'danger'; label: string }> = {
  low: { variant: 'neutral', label: 'Low' },
  normal: { variant: 'primary', label: 'Normal' },
  high: { variant: 'warning', label: 'High' },
  urgent: { variant: 'danger', label: 'Urgent' },
};

const ROLES: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admins' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
  { value: 'parent', label: 'Parents' },
  { value: 'accountant', label: 'Accountants' },
  { value: 'staff', label: 'Staff' },
];

const schema = z.object({
  title: z.string().min(1, 'Required').max(150),
  body: z.string().min(1, 'Required').max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  expiresAt: z.string().optional(),
});
type AnnouncementForm = z.infer<typeof schema>;

/**
 * Superadmin's broadcast tool — reuses the regular Notice display/inbox
 * pipeline entirely on the backend (see superadmin-announcements.service.ts),
 * so this page's only job is collecting the input: title/body/priority,
 * which roles at each institution should see it (empty = everyone), and
 * whether it goes to every institution or a hand-picked subset. Every
 * institution's own dashboard/notices page picks the result up automatically
 * via the shared DashboardNoticeBanner/DashboardNotices/NoticesView
 * components, badged "Platform" there.
 */
export function AnnouncementsView() {
  const [roles, setRoles] = useState<string[]>([]);
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<Set<string>>(new Set());
  const [selectedInstitutionNames, setSelectedInstitutionNames] = useState<Map<string, string>>(new Map());
  const [institutionSearch, setInstitutionSearch] = useState('');
  const debouncedInstitutionSearch = useDebounce(institutionSearch, 300);

  // Server-side search, not a one-shot fetch-then-filter — the backend's
  // /superadmin/institutions caps `limit` at 100 (listInstitutionsQuerySchema),
  // so an earlier version of this picker that requested `limit: 200` had
  // every request rejected outright (400), silently leaving the picker
  // permanently empty no matter what was typed. This also means the picker
  // now actually works past 100 institutions, instead of only ever seeing
  // whatever fit in one oversized page.
  const { data: institutionsRes, isLoading: institutionsLoading, isFetching: institutionsFetching } = useGetInstitutionsQuery(
    { search: debouncedInstitutionSearch || undefined, limit: 50 },
    { skip: scope !== 'selected' }
  );
  const filteredInstitutions = institutionsRes?.data ?? [];

  const { data: historyRes, isLoading: historyLoading } = useGetAnnouncementsQuery();
  const history = historyRes?.data ?? [];

  const [createAnnouncement, { isLoading: sending }] = useCreateAnnouncementMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnnouncementForm>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', body: '', priority: 'normal', expiresAt: '' },
  });

  const toggleRole = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  // Tracks names alongside ids so a selected institution stays visible (and
  // removable) as its own chip even after the search box moves on to a
  // different query and its row scrolls out of the current results — the
  // id alone isn't enough to show the admin what they picked.
  const toggleInstitution = (id: string, name: string) => {
    setSelectedInstitutionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedInstitutionNames((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id); else next.set(id, name);
      return next;
    });
  };

  const removeInstitution = (id: string) => {
    setSelectedInstitutionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedInstitutionNames((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const onSubmit = async (values: AnnouncementForm) => {
    if (scope === 'selected' && selectedInstitutionIds.size === 0) {
      toast.error('Select at least one institution, or switch to "All institutions"');
      return;
    }
    try {
      const result = await createAnnouncement({
        title: values.title,
        body: values.body,
        priority: values.priority,
        targetRoles: roles,
        expiresAt: values.expiresAt || undefined,
        institutionScope: scope,
        institutionIds: scope === 'selected' ? Array.from(selectedInstitutionIds) : undefined,
      }).unwrap();
      toast.success(`Sent to ${result.data.institutionCount} institution${result.data.institutionCount === 1 ? '' : 's'}`);
      reset();
      setRoles([]);
      setScope('all');
      setSelectedInstitutionIds(new Set());
      setSelectedInstitutionNames(new Map());
      setInstitutionSearch('');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not send announcement');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast a platform-wide update to institutions — it shows up as a badged “Platform” notice and notification everywhere a regular notice does."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles size={18} /> New announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Scheduled maintenance tonight" {...register('title')} />
              {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" rows={4} placeholder="Write your announcement…" {...register('body')} />
              {errors.body && <p className="mt-1 text-xs text-danger">{errors.body.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <select {...register('priority')} className="h-10 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires (optional)</Label>
                <input id="expiresAt" type="date" {...register('expiresAt')} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>

            <div>
              <Label>Audience</Label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const active = roles.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(r.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {roles.length === 0 ? 'No selection = visible to everyone at each institution.' : `Targeted to: ${roles.join(', ')}`}
              </p>
            </div>

            <div>
              <Label>Send to</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    scope === 'all' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  All institutions
                </button>
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    scope === 'selected' ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  Select institutions{selectedInstitutionIds.size > 0 ? ` (${selectedInstitutionIds.size})` : ''}
                </button>
              </div>

              {scope === 'selected' && (
                <div className="mt-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search size={14} className="shrink-0 text-muted-foreground" />
                    <input
                      value={institutionSearch}
                      onChange={(e) => setInstitutionSearch(e.target.value)}
                      placeholder="Search institutions…"
                      className="h-7 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>

                  {!institutionsLoading && filteredInstitutions.length > 0 && (
                    <div className="flex items-center gap-3 border-b border-border px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInstitutionIds((prev) => {
                            const next = new Set(prev);
                            filteredInstitutions.forEach((i) => next.add(i.id));
                            return next;
                          });
                          setSelectedInstitutionNames((prev) => {
                            const next = new Map(prev);
                            filteredInstitutions.forEach((i) => next.set(i.id, i.name));
                            return next;
                          });
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Select all{institutionSearch.trim() ? ' (matching)' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInstitutionIds((prev) => {
                            const next = new Set(prev);
                            filteredInstitutions.forEach((i) => next.delete(i.id));
                            return next;
                          });
                          setSelectedInstitutionNames((prev) => {
                            const next = new Map(prev);
                            filteredInstitutions.forEach((i) => next.delete(i.id));
                            return next;
                          });
                        }}
                        className="text-xs font-medium text-muted-foreground hover:underline"
                      >
                        Clear{institutionSearch.trim() ? ' (matching)' : ''}
                      </button>
                    </div>
                  )}

                  <div className="max-h-56 overflow-y-auto p-2" role="group" aria-label="Select institutions to send this announcement to">
                    {institutionsLoading || institutionsFetching ? (
                      <Skeleton className="h-24 w-full" />
                    ) : filteredInstitutions.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">
                        {institutionSearch.trim() ? 'No institutions match your search.' : 'No institutions found.'}
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {filteredInstitutions.map((inst) => {
                          const checked = selectedInstitutionIds.has(inst.id);
                          return (
                            <button
                              key={inst.id}
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => toggleInstitution(inst.id, inst.name)}
                              className={cn(
                                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                                checked ? 'bg-primary-soft text-primary-soft-foreground' : 'text-foreground hover:bg-muted'
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                  checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                                )}
                              >
                                {checked && <span className="h-2 w-2 rounded-sm bg-current" />}
                              </span>
                              <span className="truncate">{inst.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected institutions, independent of whatever's currently
                      typed in the search box above — without this, picking an
                      institution under one search term and then searching for
                      another made the first pick invisible (though still
                      selected), with no way to see or undo it short of
                      guessing the original search again. */}
                  {selectedInstitutionNames.size > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border p-2.5">
                      {Array.from(selectedInstitutionNames.entries()).map(([id, name]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => removeInstitution(id)}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground hover:border-primary/60"
                          title={`Remove ${name}`}
                        >
                          {name}
                          <span aria-hidden="true">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={sending}>Send announcement</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2.5 text-sm font-semibold text-foreground">Sent announcements</p>
        {historyLoading ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>)}</div>
        ) : history.length === 0 ? (
          <Card><EmptyState icon={Bell} title="No announcements sent yet" description="Once you send one, it'll show up here." /></Card>
        ) : (
          <div className="space-y-3">
            {history.map((a) => {
              // Falls back rather than throwing if a row's priority is ever
              // missing or doesn't match one of the four known values — a
              // page-crashing TypeError here (Cannot read 'label' of
              // undefined) previously took down the entire Announcements
              // page for every admin, not just hidden the one bad badge.
              const badge = priorityBadge[a.priority] ?? priorityBadge.normal;
              const targetRoles = a.targetRoles ?? [];
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDate(a.createdAt)}</span>
                    {a.author && <span>· {a.author}</span>}
                    <span>· {targetRoles.length === 0 ? 'Everyone' : targetRoles.map((r: string) => r + 's').join(', ')}</span>
                    <span>· {a.institutionScope === 'all' ? 'All institutions' : 'Selected institutions'}</span>
                    <span className="text-success">· Delivered to {a.institutionCount}</span>
                    {a.failedInstitutionCount > 0 && <span className="text-danger">· Failed for {a.failedInstitutionCount}</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
