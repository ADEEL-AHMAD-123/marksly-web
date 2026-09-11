import { redirect } from 'next/navigation';

// The standalone Student Logins page was retired — a single PIN lookup now
// lives inline on the Students page (see StudentsView.tsx's Login column),
// and bulk per-class roster/export lives on the Login IDs & PINs page (see
// LoginIdsView.tsx). This route is kept only so old bookmarks/links don't
// 404 — sent to the fuller of the two destinations.
export default function Page() {
  redirect('/admin/login-ids');
}
