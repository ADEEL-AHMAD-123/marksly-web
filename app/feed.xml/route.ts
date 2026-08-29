import { BLOG_POSTS } from '../blog/posts';

const BASE_URL = 'https://marksly.pk';

// A plain RSS 2.0 feed for the blog. Not for human traffic — this is a
// discovery signal: feed readers, aggregators, and some AI/news crawlers
// pick up fresh content this way faster than waiting on a full site crawl.
// Escaping is manual (no XML library in this project) — keep it that way if
// blog post content ever includes raw HTML.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const sorted = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const items = sorted
    .map((post) => {
      const url = `${BASE_URL}/blog/${post.slug}`;
      const pubDate = new Date(post.modifiedDate ?? post.date).toUTCString();
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(post.author ?? 'Marksly')}</author>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Marksly Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Practical guides on running a school, college or academy in Pakistan — attendance, fees, exams, and parent communication.</description>
    <language>en-PK</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Same reasoning as elsewhere in the marketing site — this is
      // static-ish content that changes at most a few times a month, no
      // need to regenerate on every single request.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
