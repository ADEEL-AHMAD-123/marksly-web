'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Bell, Trash2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HolidaysManager } from '@/components/notices/HolidaysManager';
import {
  useGetNoticesQuery,
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
  type NoticePriority,
  type NoticeRole,
} from '@/store/api/noticesApi';
import { cn, formatDate } from '@/lib/utils';

const priorityBadge: Record<NoticePriority, { variant: 'neutral' | 'primary' | 'warning' | 'danger'; label: string }> = {
  low: { variant: 'neutral', label: 'Low' },
  normal: { variant: 'primary', label: 'Normal' },
  high: { variant: 'warning', label: 'High' },
  urgent: { variant: 'danger', label: 'Urgent' },
};

const ROLES: { value: NoticeRole; label: string }[] = [
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
  { value: 'parent', label: 'Parents' },
  { value: 'accountant', label: 'Accountants' },
  { value: 'staff', label: 'Staff' },
];

export function NoticesView({ manage = false }: { manage?: boolean }) {
  // Only an admin (manage=true) ever sees a second tab here -- everyone
  // else's Notices page stays exactly the plain announcement feed it
  // always was. Holidays used to live inside the Timetable page; they
  // moved here because a holiday is fundamentally a calendar announcement
  // (it auto-posts a Notice on creation), so it belongs next to every
  // other announcement rather than behind a button on an unrelated grid.
  if (manage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notices" description="Post announcements and manage holidays for your institution." />
        <Tabs defaultValue="notices">
          <TabsList>
            <TabsTrigger value="notices">Notices</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
          </TabsList>
          <TabsContent value="notices" className="mt-4">
            <NoticesFeed manage />
          </TabsContent>
          <TabsContent value="holidays" className="mt-4">
            <HolidaysManager />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="Announcements from your institution." />
      <NoticesFeed manage={false} />
    </div>
  );
}

function NoticesFeed({ manage }: { manage: boolean }) {
  const { data, isLoading } = useGetNoticesQuery();
  const notices = data?.data ?? [];
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteNotice] = useDeleteNoticeMutation();

  const handleDelete = async (id: string) => {
    try {
      await deleteNotice(id).unwrap();
      toast.success('Notice deleted');
      setConfirmId(null);
    } catch {
      toast.error('Could not delete notice');
    }
  };

  return (
    <div className="space-y-4">
      {manage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> Post notice</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>)}</div>
      ) : notices.length === 0 ? (
        <Card><EmptyState icon={Bell} title="No notices yet" description={manage ? 'Post your first announcement.' : 'Check back later for announcements.'} /></Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => {
            // Falls back rather than throwing if a notice's priority is ever
            // missing or doesn't match one of the four known values (e.g.
            // older data from before priority existed) — a page-crashing
            // TypeError here would take down the entire Notices page for
            // every role at every institution, not just one bad badge.
            const badge = priorityBadge[n.priority] ?? priorityBadge.normal;
            const targetRoles = n.targetRoles ?? [];
            // Only admins ever see an expired notice at all — everyone
            // else's list() call is already filtered server-side, so this
            // can only ever be true in manage mode. Called out explicitly
            // rather than silently mixed in with still-live ones, since
            // this page is otherwise the only place an admin could
            // mistake a notice for currently reaching people when it
            // stopped doing so days or weeks ago.
            const isExpired = !!n.expiresAt && new Date(n.expiresAt).getTime() < Date.now();
            return (
            <Card key={n.id} className={cn('p-5', isExpired && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{n.title}</h3>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {n.isPlatformAnnouncement && (
                      <Badge variant="primary" className="gap-1"><Sparkles size={10} /> Platform</Badge>
                    )}
                    {isExpired && <Badge variant="neutral">Expired</Badge>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDate(n.publishedAt)}</span>
                    {n.isPlatformAnnouncement ? <span>· Marksly</span> : n.author && <span>· {n.author}</span>}
                    <span>· {targetRoles.length === 0 ? 'Everyone' : targetRoles.map((r) => r + 's').join(', ')}</span>
                    {n.expiresAt && (
                      <span>· {isExpired ? 'Expired' : 'Expires'} {formatDate(n.expiresAt)}</span>
                    )}
                  </div>
                </div>
                {manage && !n.isPlatformAnnouncement && (
                  confirmId === n.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(n.id)}>Delete</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(n.id)}
                      aria-label="Delete notice"
                      className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {manage && <PostNoticeDrawer open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

const schema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(1, 'Required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  expiresAt: z.string().optional(),
});
type NoticeForm = z.infer<typeof schema>;

function PostNoticeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createNotice, { isLoading }] = useCreateNoticeMutation();
  const [roles, setRoles] = useState<NoticeRole[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<NoticeForm>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', body: '', priority: 'normal', expiresAt: '' },
  });

  const toggleRole = (r: NoticeRole) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const onSubmit = async (values: NoticeForm) => {
    try {
      await createNotice({
        title: values.title,
        body: values.body,
        priority: values.priority,
        targetRoles: roles,
        expiresAt: values.expiresAt || undefined,
      }).unwrap();
      toast.success('Notice posted');
      reset();
      setRoles([]);
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not post notice');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[460px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Post Notice</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Mid-term exams schedule" {...register('title')} />
              {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" rows={5} placeholder="Write your announcement…" {...register('body')} />
              {errors.body && <p className="mt-1 text-xs text-danger">{errors.body.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
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
                {roles.length === 0 ? 'No selection = visible to everyone.' : `Targeted to: ${roles.join(', ')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
            <Button type="submit" loading={isLoading}>Post notice</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
