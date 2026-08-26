import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { ResultItem } from '@/store/api/portalApi';

export function ResultsList({ data, isLoading }: { data?: ResultItem[]; isLoading: boolean }) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  if (data.length === 0) return <Card><EmptyState icon={FileText} title="No results published yet" description="Published exam results will appear here." /></Card>;

  return (
    <div className="space-y-4">
      {data.map((r, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{r.examTitle}</CardTitle>
              <p className="text-xs capitalize text-muted-foreground">{r.type}</p>
            </div>
            <div className="text-right">
              <Badge variant={r.isPassed ? 'success' : 'danger'}>{r.grade} · {r.percentage}%</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{r.totalObtained}/{r.totalMarks}</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {r.marks.map((m, j) => (
                <li key={j} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium text-foreground">{m.obtained}/{m.total}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
