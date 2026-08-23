import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { PageHero } from '@/components/marketing/PageHero';
import { BLOG_POSTS } from './posts';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Practical guides on running a school or academy — attendance, fee collection, parent communication, and more.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader active="/blog" />

      <PageHero
        eyebrow="Blog"
        title="Practical guides for your institution"
        description="Straightforward, no-fluff guidance on running a school or academy."
      />

      <section className="pb-20">
        <div className="mx-auto max-w-3xl space-y-6 px-5">
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${i % 2 === 0 ? 'bg-primary' : 'bg-accent'}`} />
                {new Date(post.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                {' · '}{post.readingTime}
              </div>
              <h2 className="mt-2 text-xl font-semibold group-hover:text-primary">{post.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-foreground">
                Read more <ArrowRight aria-hidden size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
