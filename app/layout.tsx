import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from './providers';
import { ThemeScript } from '@/components/theme/ThemeScript';
import 'react-phone-number-input/style.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = 'https://marksly.pk';
// Kept under ~160 chars — Bing/Google truncate longer descriptions in the
// SERP snippet, and Bing Webmaster Tools flags anything longer as an error.
const DEFAULT_DESCRIPTION =
  'Marksly is a Pakistan-based school management platform for academies, schools and colleges — attendance, fees, exams, timetable, ID cards and WhatsApp/SMS parent messaging.';
// A same-named but unrelated school-management company (marksly.in)
// operates in India — every title/description here leads with "Marksly
// Pakistan" or otherwise says "Pakistan" explicitly, so Google (and AI
// answer engines pulling from these pages) have a strong, repeated textual
// signal to disambiguate this site from that one, rather than treating a
// bare "Marksly" query as pointing at whichever has more existing
// authority. See HomeJsonLd.tsx's disambiguatingDescription for the
// matching structured-data signal.
const DEFAULT_TITLE = 'Marksly Pakistan — School & Campus Management Software';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | Marksly Pakistan',
    default: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'school management software', 'school management system Pakistan', 'education ERP',
    'education management system Pakistan', 'academy software',
    'college management system', 'college management system Pakistan',
    'student attendance software', 'school fee management software',
    'Marksly', 'Marksly Pakistan', 'Marksly school software Pakistan',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Marksly Pakistan',
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: 'en_PK',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="alternate" type="application/rss+xml" title="Marksly Blog" href="/feed.xml" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
