#!/usr/bin/env node
/**
 * Pushes every public URL to the IndexNow protocol (https://www.indexnow.org)
 * — a single submission fans out to every participating search engine
 * (Bing, Yandex, and others) rather than waiting for each one to crawl the
 * sitemap on its own schedule. This matters specifically for "how fast does
 * a brand-new/updated page get indexed" — normal crawling can take days to
 * weeks; IndexNow submissions are typically picked up within hours.
 *
 * Why this matters for AI chatbots specifically: several answer engines
 * (Bing Copilot directly, and others that use Bing's index under the hood
 * for live web results) surface pages from Bing's index — so getting
 * indexed there faster is one of the few concrete, code-level levers that
 * actually affects "does marksly.pk show up when someone asks an AI
 * chatbot about Marksly."
 *
 * Google does NOT participate in IndexNow — for Google, submitting the
 * sitemap in Search Console and requesting indexing via the URL Inspection
 * tool (both manual, one-time setup steps) remain the levers.
 *
 * Usage: node scripts/submit-indexnow.js
 * Re-run this any time a new page is added or an existing one changes
 * meaningfully — it's cheap and safe to call repeatedly.
 */

const HOST = 'marksly.pk';
// Matches the key file actually deployed at public/<key>.txt — IndexNow
// verifies ownership by fetching https://marksly.pk/<key>.txt and checking
// it contains exactly this string, so this constant and that file must
// always be kept in sync (regenerating the key means replacing both).
const KEY = '5da1f5d220fdfad9e85b16a990cf6c94';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Kept in sync by hand with sitemap.ts's static entries — a full crawl of
// the live sitemap.xml would be more automatic, but that requires the site
// to already be deployed and reachable when this script runs, whereas this
// list works from a local checkout too (e.g. right after adding a page,
// before deploying). Blog post slugs are pulled from posts.ts directly
// below so those never need manual upkeep.
const STATIC_PATHS = [
  '/',
  '/features',
  '/pricing',
  '/testimonials',
  '/school-management-system-pakistan',
  '/college-management-system-pakistan',
  '/education-management-system-pakistan',
  '/best-school-management-software-pakistan',
  '/register',
  '/login',
  '/help',
  '/contact',
  '/blog',
];

async function main() {
  // Lazily require posts.ts's compiled output isn't available outside
  // Next's build — instead of fighting that, just re-derive blog slugs from
  // the same TS source with a tiny regex. Good enough for a URL list; this
  // script never needs the post bodies, just the slugs.
  const fs = require('fs');
  const path = require('path');
  const postsSource = fs.readFileSync(path.join(__dirname, '../app/blog/posts.ts'), 'utf8');
  const slugs = [...postsSource.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);

  const urlList = [
    ...STATIC_PATHS.map((p) => `https://${HOST}${p}`),
    ...slugs.map((s) => `https://${HOST}/blog/${s}`),
  ];

  console.log(`Submitting ${urlList.length} URLs to IndexNow for ${HOST}...`);

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });

  // IndexNow returns 200 (submitted) or 202 (accepted, key not yet
  // verified — normal on the very first run before the key file has been
  // crawled) with no useful body either way; anything else is a real
  // failure worth surfacing loudly rather than silently swallowing.
  if (res.status === 200 || res.status === 202) {
    console.log(`Submitted successfully (HTTP ${res.status}).`);
  } else {
    const body = await res.text().catch(() => '');
    console.error(`IndexNow submission failed — HTTP ${res.status} ${body}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('submit-indexnow failed:', err);
  process.exitCode = 1;
});
