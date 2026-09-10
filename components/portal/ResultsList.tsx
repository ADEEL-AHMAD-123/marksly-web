import { FileText, Clock, Laptop, User, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import type { ResultItem } from '@/store/api/portalApi';

const MODE_LABELS: Record<string, string> = {
  online: 'Online test',
  physical: 'Written exam',
  oral: 'Oral',
  practical: 'Practical',
  project: 'Project',
  assignment: 'Assignment',
};

export function ResultsList({ data, isLoading }: { data?: ResultItem[]; isLoading: boolean }) {
  if (isLoading || !data) return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  if (data.length === 0) return <Card><EmptyState icon={FileText} title="No results published yet" description="Published exam results will appear here." /></Card>;

  return (
    <div className="space-y-4">
      {data.map((r, i) => {
        const isPending = r.status === 'pending';
        // `grade` is the PREDICTED grade under a cambridge-type scheme —
        // only `officialGrade` is the real, final result. Never present the
        // predicted grade as if it were final here.
        const hasOfficial = !!r.officialGrade;
        return (
          <Card key={i}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{r.examTitle}</CardTitle>
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs capitalize text-muted-foreground">
                  <span>{r.type}</span>
                  {r.mode && (
                    <span className="flex items-center gap-1 normal-case">
                      <Laptop size={11} /> {MODE_LABELS[r.mode] ?? r.mode}
                    </span>
                  )}
                  {r.examDate && (
                    <span className="flex items-center gap-1 normal-case">
                      <CalendarDays size={11} /> {formatDate(r.examDate)}
                    </span>
                  )}
                  {r.teacherName && (
                    <span className="flex items-center gap-1 normal-case">
                      <User size={11} /> {r.teacherName}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                {isPending ? (
                  <Badge variant="warning">
                    <Clock size={12} /> Awaiting official result
                  </Badge>
                ) : hasOfficial ? (
                  <Badge variant="success">{r.officialGrade} · {r.percentage}%</Badge>
                ) : r.gradePoints != null ? (
                  <Badge variant={r.isPassed ? 'success' : 'danger'}>
                    {r.grade} · {r.gradePoints.toFixed(1)} · {r.percentage}%
                  </Badge>
                ) : (
                  <Badge variant={r.isPassed ? 'success' : 'danger'}>{r.grade} · {r.percentage}%</Badge>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPending ? `Predicted: ${r.grade} · ` : ''}{r.totalObtained}/{r.totalMarks}
                </p>
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
        );
      })}
    </div>
  );
}
