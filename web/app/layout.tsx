import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';

import './global.css';

/*
 * Outfit, Geist Mono and Instrument Serif, loaded by the browser from Google
 * Fonts rather than downloaded at build time, so a build never depends on
 * reaching the font CDN.
 */
const FONTS =
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://doorman-genlayer.vercel.app'),
  title: { default: 'Doorman: a gate that checks you read the rules', template: '%s · Doorman' },
  description:
    'A community writes its handbook and a bank of questions. An applicant answers three drawn from their own address, GenLayer validators grade each answer against the handbook, and a pass on chain is what the community bot reads to open the door.',
  openGraph: { siteName: 'Doorman', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#0b0b0e', colorScheme: 'dark' };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
