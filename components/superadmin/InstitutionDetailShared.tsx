'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';

export const TAB_PAGE_SIZE = 10;

const statusBadge: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  trial: { variant: 'warning', label: 'Trial' },
  suspended: { variant: 'danger', label: 'Suspended' },
  pending: { variant: 'neutral', label: 'Pending' },
  past_due: { variant: 'warning', label: 'Past due' },
};
// Same reasoning as InstitutionsView.tsx's fallback — this map has fallen
// out of sync with the backend's actual status enum before (past_due was
// added for overdue/auto-renewal handling without this file being updated),
// which crashed this page outright on `.variant` of `undefined`. Falling
// back to a neutral badge with the raw status string is far safer than
// trusting every future status value will be added here in lockstep.
export const fallbackBadge = (status: string) => statusBadge[status] ?? { variant: 'neutral' as const, label: status };

export function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

/** Client-side searchable + paginated table for the detail tabs (full data in memory). */
export function SearchableTable({ head, rows, placeholder, empty }: { head: string[]; rows: string[][]; placeholder: string; empty: string }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.some((c) => (c ?? '').toLowerCase().includes(q)));
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TAB_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * TAB_PAGE_SIZE, pageSafe * TAB_PAGE_SIZE);

  if (rows.length === 0) return <Card><p className="p-8 text-center text-sm text-muted-foreground">{empty}</p></Card>;

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder={placeholder} />
      {filtered.length === 0 ? (
        <Card><p className="p-8 text-center text-sm text-muted-foreground">No matches.</p></Card>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {head.map((h) => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => <TableCell key={j} className={j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>{c}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {pageSafe} of {totalPages} · {filtered.length}</p>
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
