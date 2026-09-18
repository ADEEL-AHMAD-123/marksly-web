'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, Users2, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ClassSectionOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface ClassSectionFilterProps {
  classes: ClassSectionOption[];
  classId: string;
  sectionId: string;
  /** Fired with ('', '') to clear back to "every class/section" when
   *  `allowAll` is true, or whenever a specific section is picked. */
  onChange: (classId: string, sectionId: string) => void;
  classLabel: string;
  sectionLabel: string;
  /** Shows a leading "All <classLabel>" option that clears the filter
   *  entirely — used by list-filter callers (StudentsView) but not by a
   *  roster picker that always needs one specific section chosen
   *  (ClassRosterView). */
  allowAll?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * A single combined, searchable "<class> - <section>" picker, replacing the
 * old pattern of two separate raw <Select>s (pick a class, then a now-
 * enabled section dropdown reveals itself). That pattern meant two clicks
 * and two round-trips through a keyboard-inaccessible-until-opened dropdown
 * for the single decision "which section", and became genuinely unusable
 * once a teacher or admin had a few dozen classes/sections to scroll
 * through with no way to search.
 *
 * This instead flattens every class into its sections up front, in one
 * scrollable list grouped by class, with a search box up top that matches
 * against both the class name and the section name — so typing "9 a" or
 * "grade 9" or just "a" all narrow it down immediately. Selecting a section
 * sets both class and section in one click and closes the menu; the
 * trigger itself always shows the combined "<class> - <section>" label so
 * the current filter reads as one decision, not two.
 */
export function ClassSectionFilter({
  classes, classId, sectionId, onChange, classLabel, sectionLabel, allowAll, placeholder, className,
}: ClassSectionFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const selectedSection = selectedClass?.sections.find((s) => s.id === sectionId);

  const triggerLabel = selectedClass
    ? selectedSection
      ? `${selectedClass.name} - ${selectedSection.name}`
      : selectedClass.name
    : placeholder ?? `Select ${classLabel.toLowerCase()} & ${sectionLabel.toLowerCase()}`;

  const q = search.trim().toLowerCase();
  const filteredClasses = useMemo(() => {
    if (!q) return classes;
    return classes
      .map((c) => {
        const classMatches = c.name.toLowerCase().includes(q);
        const sections = classMatches
          ? c.sections
          : c.sections.filter(
              (s) => s.name.toLowerCase().includes(q) || `${c.name} ${s.name}`.toLowerCase().includes(q)
            );
        return sections.length > 0 ? { ...c, sections } : null;
      })
      .filter((c): c is ClassSectionOption => c !== null);
  }, [classes, q]);

  const select = (cId: string, sId: string) => {
    onChange(cId, sId);
    setOpen(false);
    setSearch('');
  };

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            !selectedClass && 'text-muted-foreground',
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Users2 size={15} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 w-[--radix-dropdown-menu-trigger-width] min-w-[16rem] overflow-hidden p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // Radix DropdownMenu's built-in typeahead would otherwise
              // steal every keystroke to jump-focus a menu item by its
              // first letter, making it impossible to actually type a
              // search term — stopping propagation here keeps keystrokes
              // (including arrow keys) inside this input instead.
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={`Search ${classLabel.toLowerCase()} or ${sectionLabel.toLowerCase()}…`}
              className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-7 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {allowAll && (
            <>
              <button
                type="button"
                onClick={() => select('', '')}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-muted',
                  !classId && 'font-medium text-primary'
                )}
              >
                {!classId && <Check size={14} className="shrink-0" />}
                <span className={cn(!classId ? '' : 'pl-[22px]')}>All {classLabel.toLowerCase()}</span>
              </button>
              {filteredClasses.length > 0 && <DropdownMenuSeparator />}
            </>
          )}

          {filteredClasses.length === 0 ? (
            <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">
              No {classLabel.toLowerCase()} or {sectionLabel.toLowerCase()} match &ldquo;{search}&rdquo;
            </p>
          ) : (
            filteredClasses.map((c) => (
              <div key={c.id}>
                <DropdownMenuLabel className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.name}
                </DropdownMenuLabel>
                {allowAll && (
                  <button
                    type="button"
                    onClick={() => select(c.id, '')}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-muted',
                      classId === c.id && !sectionId && 'font-medium text-primary'
                    )}
                  >
                    {classId === c.id && !sectionId && <Check size={14} className="shrink-0" />}
                    <span className={cn(classId === c.id && !sectionId ? '' : 'pl-[22px]')}>
                      All of {c.name}
                    </span>
                  </button>
                )}
                {c.sections.map((s) => {
                  const isSelected = classId === c.id && sectionId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => select(c.id, s.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-muted',
                        isSelected && 'font-medium text-primary'
                      )}
                    >
                      {isSelected && <Check size={14} className="shrink-0" />}
                      <span className={cn(isSelected ? '' : 'pl-[22px]')}>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
