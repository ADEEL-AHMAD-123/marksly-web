'use client';

import { Check, Palette } from 'lucide-react';
import { THEMES } from '@/lib/themes';
import { useTheme } from './ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Change theme"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          <Palette className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => setTheme(t.id)}
              className={cn(active && 'bg-muted')}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-border"
                style={{ background: t.swatch }}
              />
              <span className="flex-1">{t.name}</span>
              {active && <Check size={15} className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
