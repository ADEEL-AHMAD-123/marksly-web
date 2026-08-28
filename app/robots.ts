import { MetadataRoute } from 'next';

const BASE_URL = 'https://marksly.pk';

// Every authenticated dashboard route (per-role portals) and the
// password-reset/verify-email token pages have no SEO value and shouldn't
// be crawled or show up in search results — same disallow list for every
// bot below, human or AI.
const DASHBOARD_DISALLOW = ['/student', '/admin', '/superadmin', '/teacher', '/parent', '/accountant', '/verify-email', '/forgot-password/reset'];
const MARKETING_ALLOW = [
  '/', '/login', '/register', '/pricing', '/features', '/help', '/contact', '/blog',
  '/school-management-system-pakistan', '/college-management-system-pakistan', '/education-management-system-pakistan',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: MARKETING_ALLOW,
        disallow: DASHBOARD_DISALLOW,
      },
      // Explicitly named (functionally redundant with the '*' rule above,
      // since none of these are disallowed there either) so it's visible at
      // a glance — to a human or an AEO auditing tool reading this file —
      // that AI answer-engine crawlers are deliberately welcome here, not
      // just incidentally uncovered by the wildcard.
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'anthropic-ai'],
        allow: MARKETING_ALLOW,
        disallow: DASHBOARD_DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
