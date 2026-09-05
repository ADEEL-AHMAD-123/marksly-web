'use client';

import { useState } from 'react';
import { School, Users, Layers, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyClassesQuery } from '@/store/api/portalApi';
import { StudentFormDrawer } from '@/components/students/StudentFormDrawer';
import { useTerminology } from '@/lib/terminology';

export function TeacherClassesView() {
  const terminology = useTerminology();
  const { data, isLoading } = useMyClassesQuery();
  const classes = data?.data ?? [];
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`My ${terminology.classUnitPlural}`}
        description={`${terminology.classUnitPlural} and ${terminology.sectionPlural.toLowerCase()} you teach.`}
        actions={
          classes.length > 0 ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus size={15} /> Add student
            </Button>
          ) : undefined
        }
      />

      <StudentFormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classesOverride={classes.map((c) => ({ id: c.id, name: c.name, termType: c.termType, sections: c.sections }))}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-28 w-full" /></Card>)}
        </div>
      ) : classes.length === 0 ? (
        <Card><EmptyState icon={School} title={`No ${terminology.classUnitPlural.toLowerCase()} assigned`} description={`You'll see ${terminology.classUnitPlural.toLowerCase()} here once you're assigned to ${terminology.sectionPlural.toLowerCase()}.`} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const total = c.sections.reduce((s, x) => s + x.students, 0);
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><School size={18} /></span>
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.termName ?? 'No term'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.sections.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      <Layers size={11} /> {s.name} · {s.students}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                  <Users size={14} /> {total} student{total === 1 ? '' : 's'}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
