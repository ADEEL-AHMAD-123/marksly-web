import type { Metadata } from 'next';
import { MyIdCardView } from '@/components/shared/MyIdCardView';

export const metadata: Metadata = { title: 'My ID Card' };

export default function Page() {
  return <MyIdCardView />;
}
