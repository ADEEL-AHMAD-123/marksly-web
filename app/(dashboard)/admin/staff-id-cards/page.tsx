import { redirect } from 'next/navigation';

// Staff ID cards moved into the "Staff" tab of the unified ID Cards page —
// this route just forwards any old links/bookmarks there instead of 404ing.
export default function Page() {
  redirect('/admin/id-cards?tab=staff');
}
