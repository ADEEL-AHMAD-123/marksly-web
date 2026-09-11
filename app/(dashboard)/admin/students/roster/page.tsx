import { redirect } from 'next/navigation';

// The standalone Student Logins page was merged into the Students page (see
// StudentsView.tsx's "Class logins" dialog and its Login column) — this
// route is kept only so old bookmarks/links don't 404.
export default function Page() {
  redirect('/admin/students');
}
