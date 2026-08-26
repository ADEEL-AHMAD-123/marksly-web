import { InstitutionDetailView } from '@/components/superadmin/InstitutionDetailView';

// Server Component — Next.js hands `params` to page components directly, so
// there's no need for the client-only `useParams()` hook (and the 'use
// client' it required) just to read a route segment. InstitutionDetailView
// itself still owns all the interactivity/data-fetching and stays a client
// component.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InstitutionDetailView id={id} />;
}
