import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { ThemeScript } from '@/components/theme/ThemeScript';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = 'https://marksly.pk';
const DEFAULT_DESCRIPTION =
  'Marksly is the complete school management platform for academies, schools, colleges and universities — students, attendance, fees, exams, timetable, ID cards and WhatsApp/SMS parent messaging in one place.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | Marksly',
    default: 'Marksly — School & Campus Management Software',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'school management software', 'education ERP', 'academy software',
    'college management system', 'student attendance software', 'school fee management software',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
