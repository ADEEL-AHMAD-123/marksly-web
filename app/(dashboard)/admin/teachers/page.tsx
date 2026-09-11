import { redirect } from 'next/navigation';

// Teachers now live under the unified Staff page's "Teacher" tab — this
// route is kept only so old bookmarks/links still land somewhere useful,
// mirroring the redirect pattern already used for the old student roster
// route (see app/(dashboard)/admin/students/roster/page.tsx).
export default function Page() {
  redirect('/admin/staff?tab=teacher');
}
