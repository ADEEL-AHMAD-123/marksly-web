import { ImageResponse } from 'next/og';
import { getPostBySlug, BLOG_POSTS } from '../posts';

// No `export const runtime = 'edge'` here — Next.js doesn't allow combining
// the edge runtime with `generateStaticParams` on an image-metadata route
// (it needs Node to pre-render each slug's image at build time), and broke
// the Vercel build with "Page ... cannot use both `runtime = 'edge'` and
// `generateStaticParams`." The default (Node.js) runtime works fine for
// `ImageResponse` and is what static generation actually needs here.
export const alt = 'Marksly';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? 'Marksly';
  const description = post?.description ?? 'School & campus management software';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#0b1220',
          backgroundImage:
            'radial-gradient(circle at 85% 15%, rgba(56,189,248,0.18), transparent 55%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#38bdf8',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: '#0b1220',
            }}
          >
            M
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Marksly</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#f8fafc',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 26,
              lineHeight: 1.4,
              color: '#94a3b8',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 22, color: '#64748b' }}>marksly.pk</div>
      </div>
    ),
    { ...size }
  );
}
