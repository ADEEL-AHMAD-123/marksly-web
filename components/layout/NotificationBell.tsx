'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Wallet, Megaphone, UserCircle, Award, Sparkles, Inbox as InboxIcon } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, cn } from '@/lib/utils';
import {
  useGetInboxQuery, useGetInboxUnreadCountQuery, useMarkInboxReadMutation, useMarkAllInboxReadMutation,
  type InboxItem, type InboxItemType,
} from '@/store/api/inboxApi';

const TYPE_ICON: Record<InboxItemType, typeof Bell> = {
  fee_paid: Wallet,
  notice: Megaphone,
  account: UserCircle,
  exam_result: Award,
  plan_request: Sparkles,
};

const TYPE_TONE: Record<InboxItemType, string> = {
  fee_paid: 'bg-success-soft text-success',
  notice: 'bg-primary-soft text-primary-soft-foreground',
  account: 'bg-muted text-muted-foreground',
  exam_result: 'bg-warning-soft text-warning',
  plan_request: 'bg-primary-soft text-primary-soft-foreground',
};

/** The bell's dropdown — a real, working notification center (see
 *  RoleGuard/StaffView etc for the rest of this session's work; previously
 *  this was a static, permanently-"unread" icon with nothing behind it,
 *  see Navbar.tsx's git history). Polls the unread count every 30s
 *  (see inboxApi.ts's comment on why polling over Socket.io for phase one)
 *  and only fetches the actual list once the dropdown is opened. */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: countRes } = useGetInboxUnreadCountQuery(undefined, { pollingInterval: 30_000 });
  const unread = countRes?.data.count ?? 0;

  const { data: listRes, isLoading } = useGetInboxQuery({ limit: 15 }, { skip: !open });
  const items = listRes?.data ?? [];

  const [markRead] = useMarkInboxReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllInboxReadMutation();

  const onItemClick = (item: InboxItem) => {
    if (!item.read) markRead(item._id);
    setOpen(false);
    if (item.link) router.push(item.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-danger-foreground ring-2 ring-card">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        // On a narrow phone this panel is nearly the full screen width —
        // `calc(100vw-1.5rem)` guarantees a consistent ~12px gutter on
        // each side no matter how small the viewport is, rather than a
        // fixed rem width that could either overflow or (on `max-w-[90vw]`
        // alone) leave an inconsistent, screen-size-dependent margin.
        className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3 sm:px-4">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unread > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={() => markAllRead()}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {/* Height caps at a viewport-relative bound first — a fixed 24rem
            max-height can be taller than the whole screen on a short phone
            in landscape, pinning the list against the top/bottom of the
            viewport with no room for it to shrink. `sm:` overrides back to
            the fixed height once there's enough vertical room to spare. */}
        <div className="max-h-[60vh] overflow-y-auto sm:max-h-[24rem]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <InboxIcon size={18} />
              </span>
              <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type] ?? Bell;
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
                        !item.read && 'bg-primary-soft/40'
                      )}
                    >
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TYPE_TONE[item.type])}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('truncate text-sm', item.read ? 'font-medium text-foreground' : 'font-semibold text-foreground')}>
                            {item.title}
                          </span>
                          {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                          {item.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground/70">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
