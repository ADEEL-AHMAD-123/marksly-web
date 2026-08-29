import type { Metadata } from 'next';
import { QuestionBankView } from '@/components/exams/QuestionBankView';

export const metadata: Metadata = { title: 'Question Bank' };

export default function Page() {
  return <QuestionBankView />;
}
