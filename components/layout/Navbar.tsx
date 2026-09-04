'use client';

import { LogOut, User, Menu, Repeat, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout, setCredentials } from '@/store/slices/authSlice';
import { useLogoutMutation, useSwitchRoleMutation } from '@/store/api/authApi';
import { baseApi } from '@/store/api/baseApi';
import toast from 'react-hot-toast';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Avatar } from '@/components/ui/avatar';
import { LogoMark } from '@/components/brand/Logo';
import { useGetMyInstitutionQuery } from '@/store/api/institutionApi';
import { getInitials } from '@/lib/utils';
import { roleHome, ROLE_LABELS } from '@/lib/role-routes';
import { useLayout } from './layout-context';
import { NotificationBell } from './NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [logoutMutation] = useLogoutMutation();
  const [switchRole, { isLoading: switching }] = useSwitchRoleMutation();
  const { setMobileOpen } = useLayout();
  // Same institution-branding swap as SidebarNav's header — keeps the
  // mobile top-bar mark consistent with the drawer instead of showing the
  // generic Marksly mark in the collapsed bar and the school's own logo
  // the moment the drawer opens, which would look like a glitch.
  const isSuperadmin = user?.role === 'superadmin';
  const { data: institutionRes } = useGetMyInstitutionQuery(undefined, { skip: isSuperadmin });
  const institution = institutionRes?.data;

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      /* ignore network errors on logout */
    } finally {
      dispatch(logout());
      router.replace('/login');
      toast.success('Logged out successfully');
    }
  };

  const handleSwitchRole = async (role: string) => {
    if (switching || role === user?.role) return;
    try {
      const res = await switchRole({ role }).unwrap();
      dispatch(setCredentials({ user: res.data.user, accessToken: res.data.accessToken }));
      // Drop cached data so every view refetches under the new role.
      dispatch(baseApi.util.resetApiState());
      router.replace(roleHome(role));
      toast.success(`Switched to ${ROLE_LABELS[role] ?? role}`);
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not switch role');
    }
  };

  const initials = user ? getInitials(user.firstName, user.lastName) : '';
  const availableRoles = user?.roles ?? [];
  const canSwitch = availableRoles.length > 1;

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 shadow-[0_1px_0_0_rgba(0,0,0,0.03),0_8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6 lg:h-[70px] lg:px-8"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Mobile: hamburger + brand mark — the header previously had nothing
          between the menu button and the right-side icons on phones, which
          both looked empty and made the (already small) icons the only
          thing to look at. The mark gives it an anchor. */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          <Menu className="h-6 w-6" />
        </button>
        {!isSuperadmin && institution?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={institution.logoUrl} alt={`${institution.name} logo`} width={26} height={26} className="h-[26px] w-[26px] rounded-md object-cover" />
        ) : (
          <LogoMark size={26} variant="plain" className="text-foreground" />
        )}
      </div>

      <div className="flex-1" />

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Theme switching is a super-admin-only control */}
        {user?.role === 'superadmin' && <ThemeSwitcher />}

        <NotificationBell />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2.5 rounded-xl border-l border-border pl-3 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar initials={initials} size="md" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-none text-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {canSwitch && (
              <>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <Repeat size={13} /> Switch role
                </DropdownMenuLabel>
                {availableRoles.map((r) => (
                  <DropdownMenuItem key={r} onSelect={() => handleSwitchRole(r)} disabled={switching}>
                    <span className="flex w-4 justify-center">
                      {r === user?.role ? <Check size={15} className="text-primary" /> : null}
                    </span>
                    {ROLE_LABELS[r] ?? r}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onSelect={() => router.push(`/${user?.role}/settings`)}>
              <User size={16} />
              Profile &amp; Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="text-danger focus:bg-danger-soft focus:text-danger"
            >
              <LogOut size={16} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
