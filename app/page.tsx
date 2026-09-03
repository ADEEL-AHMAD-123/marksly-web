import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { HomeJsonLd } from '@/components/marketing/HomeJsonLd';
import { HomeHero } from '@/components/marketing/HomeHero';
import { HomeDifferentiators } from '@/components/marketing/HomeDifferentiators';
import { HomeFeatures } from '@/components/marketing/HomeFeatures';
import { HomeTrustLogos } from '@/components/marketing/HomeTrustLogos';
import { HomeSecurity } from '@/components/marketing/HomeSecurity';
import { HomePricingTeaser } from '@/components/marketing/HomePricingTeaser';
import { HomeCta } from '@/components/marketing/HomeCta';

export const metadata: Metadata = {
  // "Marksly Pakistan" explicitly, not just "Marksly" — see layout.tsx's
  // comment on disambiguating from the unrelated same-named marksly.in.
  title: 'Marksly Pakistan — School & Campus Management Software',
  // Kept under ~160 chars — Bing/Google truncate longer descriptions in the
  // SERP snippet, and Bing Webmaster Tools flags it as an error outright.
  description:
    'Marksly is a Pakistan-based school management platform for academies, schools, colleges and universities — attendance, fees, exams, timetable, ID cards and parent messaging.',
  alternates: { canonical: '/' },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeJsonLd />

      <MarketingHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <HomeHero />

      {/* ── Differentiator strip — real cards with a headline, not a bare
           numbered text row ──────────────────────────────────────────── */}
      <HomeDifferentiators />

      {/* ── Features: bento grid ─────────────────────────────────────── */}
      <HomeFeatures />

      {/* ── Trust — institutions using Marksly, as a marquee ─────────────── */}
      <HomeTrustLogos />

      {/* ── Security & data — navy, opens the "trust + commit" zone that
           runs into pricing right below it ─────────────────────────────── */}
      <HomeSecurity />

      {/* ── Pricing teaser — continues the navy zone; hairline seam above
           keeps it legible as its own section rather than a blurred merge ── */}
      <HomePricingTeaser />

      {/* ── CTA — light, deliberately breaking the dark run: security →
           pricing → footer are all navy, so this stays light as the
           breathing gap between them, not a fourth dark section ─────────── */}
      <HomeCta />

      <MarketingFooter />
    </div>
  );
}
