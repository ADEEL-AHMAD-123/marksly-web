import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <Logo size={28} />
            <p className="mt-3 text-sm text-sidebar-muted">
              School &amp; campus management software for academies, schools, colleges and universities.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-sidebar-muted">
              <li><Link href="/features" className="hover:text-sidebar-foreground">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-sidebar-foreground">Pricing</Link></li>
              <li><Link href="/register" className="hover:text-sidebar-foreground">Start free trial</Link></li>
              <li><Link href="/login" className="hover:text-sidebar-foreground">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Solutions</p>
            <ul className="mt-3 space-y-2 text-sm text-sidebar-muted">
              <li><Link href="/school-management-system-pakistan" className="hover:text-sidebar-foreground">School Management System</Link></li>
              <li><Link href="/college-management-system-pakistan" className="hover:text-sidebar-foreground">College Management System</Link></li>
              <li><Link href="/education-management-system-pakistan" className="hover:text-sidebar-foreground">Education Management System</Link></li>
              <li><Link href="/best-school-management-software-pakistan" className="hover:text-sidebar-foreground">Buyer&apos;s Guide</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Resources</p>
            <ul className="mt-3 space-y-2 text-sm text-sidebar-muted">
              <li><Link href="/help" className="hover:text-sidebar-foreground">Help Center</Link></li>
              <li><Link href="/blog" className="hover:text-sidebar-foreground">Blog</Link></li>
              <li><Link href="/testimonials" className="hover:text-sidebar-foreground">Reviews</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-sidebar-muted">
              <li><Link href="/contact" className="hover:text-sidebar-foreground">Contact</Link></li>
              <li><a href="mailto:support@marksly.pk" className="hover:text-sidebar-foreground">support@marksly.pk</a></li>
              <li><a href="https://wa.me/923175496466" className="hover:text-sidebar-foreground">WhatsApp</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-sidebar-border pt-6 text-xs text-sidebar-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Marksly · marksly.pk</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-sidebar-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-sidebar-foreground">Terms of Service</Link>
          </div>
          <p>Made for schools, colleges and academies.</p>
        </div>
      </div>
    </footer>
  );
}
