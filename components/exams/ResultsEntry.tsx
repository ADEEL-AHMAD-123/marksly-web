'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Send, Save, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  useGetExamResultsQuery,
  useSaveExamResultsMutation,
  usePublishExamMutation,
} from '@/store/api/examsApi';

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

type MarksState = Record<string, Record<string, string>>; // studentId -> subject -> value

export function ResultsEntry({ examId, onBack }: { examId: string; onBack: () => void }) {
  // refetchOnFocus off here too, same reasoning as AttendanceView's roster
  // query: this screen holds unsaved typed marks in local state seeded from
  // this query, and a background refetch that returns genuinely different
  // data (not just a same-data no-op protected by structural sharing) would
  // silently wipe whatever the teacher was mid-typing when they switched
  // tabs and back.
  const { data, isLoading } = useGetExamResultsQuery(examId, { refetchOnFocus: false });
  const [saveResults, { isLoading: saving }] = useSaveExamResultsMutation();
  const [publishExam, { isLoading: publishing }] = usePublishExamMutation();
  const [marks, setMarks] = useState<MarksState>({});

  const roster = data?.data;

  useEffect(() => {
    if (roster) {
      const seed: MarksState = {};
      roster.students.forEach((s) => {
        seed[s.studentId] = {};
        s.marks.forEach((m) => {
          seed[s.studentId][m.name] = m.obtained === null ? '' : String(m.obtained);
        });
      });
      setMarks(seed);
    }
  }, [roster]);

  if (isLoading || !roster) {
    return <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>;
  }

  const { exam, students } = roster;

  const setMark = (studentId: string, subject: string, value: string, max: number) => {
    let v = value.replace(/[^0-9.]/g, '');
    if (v !== '' && Number(v) > max) v = String(max);
    setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [subject]: v } }));
  };

  const rowTotal = (studentId: string) => {
    const row = marks[studentId] || {};
    return exam.subjects.reduce((sum, s) => sum + (Number(row[s.name]) || 0), 0);
  };

  const save = async () => {
    const records = students.map((s) => ({
      studentId: s.studentId,
      marks: exam.subjects.map((sub) => ({
        name: sub.name,
        obtained: Number(marks[s.studentId]?.[sub.name]) || 0,
      })),
    }));
    try {
      await saveResults({ examId, records }).unwrap();
      toast.success('Results saved');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not save results');
    }
  };

  const publish = async () => {
    try {
      await publishExam(examId).unwrap();
      toast.success('Results published to students');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Could not publish');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">{exam.title}</h2>
            <p className="text-xs text-muted-foreground">
              {exam.className} · {exam.totalMarks} total marks
              {exam.published && <span className="ml-1 text-success">· Published</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" loading={saving} onClick={save}>
            <Save size={16} /> Save
          </Button>
          <Button size="sm" loading={publishing} onClick={publish} disabled={exam.published}>
            {exam.published ? <><CheckCircle2 size={16} /> Published</> : <><Send size={16} /> Publish</>}
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No students in this class/section yet.
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 bg-muted/50">Student</TableHead>
                {exam.subjects.map((s) => (
                  <TableHead key={s.name} className="text-center">
                    {s.name}
                    <span className="block font-normal normal-case text-muted-foreground">/{s.totalMarks}</span>
                  </TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const total = rowTotal(s.studentId);
                const pct = exam.totalMarks ? Math.round((total / exam.totalMarks) * 1000) / 10 : 0;
                const passed = pct >= 40;
                return (
                  <TableRow key={s.studentId}>
                    <TableCell className="sticky left-0 bg-card">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.rollNumber}</p>
                    </TableCell>
                    {exam.subjects.map((sub) => (
                      <TableCell key={sub.name} className="text-center">
                        <input
                          inputMode="numeric"
                          value={marks[s.studentId]?.[sub.name] ?? ''}
                          onChange={(e) => setMark(s.studentId, sub.name, e.target.value, sub.totalMarks)}
                          className="h-9 w-16 rounded-lg border border-input bg-card text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-medium text-foreground">{total}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{pct}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={passed ? 'success' : 'danger'}>{gradeFor(pct)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
}
