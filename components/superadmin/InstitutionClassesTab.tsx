'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { type InstitutionDetail } from '@/store/api/superadminApi';
import { TAB_PAGE_SIZE } from './InstitutionDetailShared';

/** Classes tab — client-side searchable + paginated, keeping the section chips. */
export function InstitutionClassesTab({ classes }: { classes: InstitutionDetail['classes'] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) =>
      [c.name, c.termName, ...c.sections.map((s) => s.name)].some((v) => (v ?? '').toLowerCase().includes(q))
    );
  }, [classes, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TAB_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * TAB_PAGE_SIZE, pageSafe * TAB_PAGE_SIZE);

  if (classes.length === 0) return <Card><p className="p-8 text-center text-sm text-muted-foreground">No classes.</p></Card>;

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search classes by name, year or section…" />
      {filtered.length === 0 ? (
        <Card><p className="p-8 text-center text-sm text-muted-foreground">No matches.</p></Card>
      ) : (
        <>
          <Card><CardContent className="p-0">
            <ul className="divide-y divide-border">
              {paged.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.termName ?? 'No term'}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {c.sections.map((s) => (
                      <span key={s.name} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{s.name} · {s.students}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent></Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {pageSafe} of {totalPages} · {filtered.length} classes</p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)} aria-label="Previous"><ChevronLeft size={16} /></Button>
              <Button variant="secondary" size="icon" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)} aria-label="Next"><ChevronRight size={16} /></Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
