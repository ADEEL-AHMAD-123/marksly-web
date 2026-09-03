import { MetadataRoute } from 'next';
import { BLOG_POSTS } from './blog/posts';

const BASE_URL = 'https://marksly.pk';

/**
 * Only public, unauthenticated pages belong here — everything under
 * (dashboard) (student/admin/superadmin/teacher/parent portals) requires
 * login and should never be crawled or indexed; robots.ts disallows those
 * explicitly for the same reason.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Deliberately NOT stamping every static page with `new Date()` — that
  // regenerates on every build/request, so Google would see a "last
  // modified: right now" on pages that didn't actually change. Google's own
  // guidance is that an inaccurate lastmod is worse than none: it can cause
  // Google to stop trusting the lastmod signal for the whole sitemap. Since
  // these pages don't have a tracked real modification date, omit the field
  // entirely rather than fake one — Google will just fall back to its own
  // crawl-based freshness signals for them.
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/features`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.9 },
    // Keyword-targeted marketing landing pages — same treatment as
    // /features (own copy, own FAQ JSON-LD), aimed at generic-intent
    // searches ("school management system Pakistan" etc.) rather than
    // brand-name searches, since /,/features,/pricing already cover brand.
    { url: `${BASE_URL}/school-management-system-pakistan`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/college-management-system-pakistan`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/education-management-system-pakistan`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/best-school-management-software-pakistan`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/testimonials`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/register`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    // Use modifiedDate when set (a post that's been edited after publishing)
    // so search engines see a real reason to recrawl — falling back to the
    // original publish date otherwise. Matches the same modifiedDate logic
    // already used in the Article JSON-LD on the post page itself.
    lastModified: new Date(post.modifiedDate ?? post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // The blog index's real "last modified" IS a meaningful signal — it's
  // exactly the date of whichever post was published/edited most recently —
  // unlike the static pages above, which have no tracked date at all.
  const newestBlogDate = blogPages.reduce<Date | null>(
    (latest, p) => (!latest || (p.lastModified as Date) > latest ? (p.lastModified as Date) : latest),
    null
  );
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: newestBlogDate ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  return [...staticPages, ...blogIndex, ...blogPages];
}
