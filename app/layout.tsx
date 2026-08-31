import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://redwoodresearch.cortexhubs.com'),
  title: 'Redwood - U.S. Equity Research Platform',
  description: 'A local-first, evidence-led, and auditable U.S. equity research platform.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'Redwood - U.S. Equity Research Platform',
    description: 'Evidence-led research, rooted locally.',
    url: '/',
    siteName: 'Redwood',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Redwood U.S. Equity Research Platform' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Redwood - U.S. Equity Research Platform',
    description: 'Evidence-led research, rooted locally.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
