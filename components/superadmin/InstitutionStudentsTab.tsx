'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetInstitutionStudentsQuery } from '@/store/api/superadminApi';
import { TAB_PAGE_SIZE } from './InstitutionDetailShared';

/** Students tab — full, server-side searchable + paginated list for this institution. */
export function InstitutionStudentsTab({ institutionId }: { institutionId: string }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(query, 350);

  const { data, isLoading, isFetching } = useGetInstitutionStudentsQuery({
    id: institutionId, search: debounced || undefined, page, limit: TAB_PAGE_SIZE,
  });
  const rows = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search students by name or roll…" />
      {isLoading ? (
        <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
      ) : rows.length === 0 ? (
        <Card><p className="p-8 text-center text-sm text-muted-foreground">{debounced ? 'No students match.' : 'No students.'}</p></Card>
      ) : (
        <div className={isFetching ? 'opacity-60' : ''}>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.rollNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{s.className ?? '—'}</TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'success' : 'neutral'} className="capitalize">{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data?.meta?.total ?? rows.length} students</p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous"><ChevronLeft size={16} /></Button>
              <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next"><ChevronRight size={16} /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
