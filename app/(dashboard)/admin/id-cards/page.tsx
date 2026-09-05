import type { Metadata } from 'next';
import { IdCardsHub } from '@/components/students/IdCardsHub';

export const metadata: Metadata = { title: 'ID Cards' };

export default function Page() {
  return <IdCardsHub />;
}
