'use client';

import { use } from 'react';
import { ExamTakingView } from '@/components/portal/ExamTakingView';

export default function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  return <ExamTakingView examId={examId} />;
}
