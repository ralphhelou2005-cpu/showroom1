import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Nav from '@/components/Nav';
import PageChrome from '@/components/PageChrome';
import { dir, routing } from '@/i18n/routing';
import { fontVariables } from '../fonts';
import '../globals.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = { themeColor: '#0B0D14' };

/* the frame of every public page: the visitor's language and reading direction, the nav, the background.
   Words are translated on the server; the browser gets no translation library (see src/i18n/link.tsx). */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} dir={dir(locale)} className={fontVariables} data-scroll-behavior="smooth">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <PageChrome />
        <Nav />
        {children}
      </body>
    </html>
  );
}
