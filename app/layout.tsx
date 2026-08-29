import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { ThemeScript } from '@/components/theme/ThemeScript';
import 'react-phone-number-input/style.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = 'https://marksly.pk';
// Kept under ~160 chars — Bing/Google truncate longer descriptions in the
// SERP snippet, and Bing Webmaster Tools flags anything longer as an error.
const DEFAULT_DESCRIPTION =
  'Marksly is a school management platform for academies, schools and colleges — attendance, fees, exams, timetable, ID cards and WhatsApp/SMS parent messaging.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | Marksly',
    default: 'Marksly — School & Campus Management Software',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'school management software', 'school management system Pakistan', 'education ERP',
    'education management system Pakistan', 'academy software',
    'college management system', 'college management system Pakistan',
    'student attendance software', 'school fee management software',
    'Marksly',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Marksly',
    url: SITE_URL,
    title: 'Marksly — School & Campus Management Software',
    description: DEFAULT_DESCRIPTION,
    locale: 'en_PK',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Marksly — School & Campus Management Software',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marksly — School & Campus Management Software',
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
      </body>
    </html>
  );
}
