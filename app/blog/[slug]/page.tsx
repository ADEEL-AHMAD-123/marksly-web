import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PreferredSourceButton } from '@/components/marketing/PreferredSourceButton';
import { BLOG_POSTS, getPostBySlug } from '../posts';

const SITE_URL = 'https://marksly.pk';

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.modifiedDate ?? post.date,
      authors: [post.author ?? 'Marksly'],
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/og-image.png'],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // Article structured data — helps Google understand this page as a
  // dated, authored article (headline/dates/author/publisher), which is
  // one of the quality signals Google's docs list for Preferred Sources
  // eligibility, on top of just being useful for normal article rich
  // results. https://developers.google.com/search/docs/appearance/preferred-sources
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.modifiedDate ?? post.date,
    author: { '@type': 'Organization', name: post.author ?? 'Marksly', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Marksly',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    image: [`${SITE_URL}/og-image.png`],
  };

  // BreadcrumbList — lets Google show Home > Blog > Post Title in the
  // result snippet instead of a bare URL, and gives AI answer engines an
  // explicit signal of where this page sits in the site (useful context
  // when they're deciding how to describe/cite it).
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Google's "Add as Preferred Source" button script — loaded once here
          since it's only relevant on article pages, not the whole site. */}
      <Script async src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <MarketingHeader active="/blog" />

      <article className="mx-auto max-w-2xl px-5 py-16">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft aria-hidden size={14} /> Back to blog
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent">
          {new Date(post.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}{post.readingTime}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
        <div className="mt-4">
          <PreferredSourceButton />
        </div>
        <span aria-hidden className="mt-5 block h-1 w-14 rounded-full bg-accent" />

        <div className="mt-8">
          {post.body.map((para, i) =>
            para.startsWith('## ') ? (
              <h2 key={i} className="mt-8 border-l-2 border-accent pl-3 text-xl font-bold tracking-tight text-foreground">
                {para.replace('## ', '')}
              </h2>
            ) : (
              <p key={i} className="mt-4 leading-relaxed text-foreground/90">
                {para}
              </p>
            )
          )}
        </div>
      </article>

      <section className="relative overflow-hidden bg-sidebar py-16 text-sidebar-foreground">
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-accent opacity-[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Ready to try Marksly?</h2>
          <p className="mx-auto mt-2 max-w-md text-sidebar-muted">
            Start free — no card required, set up in minutes.
          </p>
          <Link href="/register" className={`${buttonVariants({ size: 'lg' })} mt-6 !bg-accent !text-accent-foreground hover:!bg-accent/90`}>
            Start free trial <ArrowRight aria-hidden size={18} />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
