'use client';
import NextLink from 'next/link';
import { useParams, usePathname as useNextPathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { routing, type Locale } from './routing';

/* The language-aware link and path for the browser, without the language library in the page's script (it would
   add 15 KB to every page, and the browser only needs the language for addresses). The language comes from the
   address itself (/fr/…, /ar/…, or English with no prefix), the same way next-intl's routing reads it.
   Words are translated on the server and handed to browser components as plain text. */
const useLocale = (): Locale => {
  const p = useParams<{ locale?: string }>();
  return (routing.locales as readonly string[]).includes(p?.locale ?? '') ? (p!.locale as Locale) : routing.defaultLocale;
};

/* "/inventory" in French becomes "/fr/inventory"; English keeps the plain address */
export function localize(href: string, locale: Locale): string {
  if (locale === routing.defaultLocale || !href.startsWith('/')) return href;
  return '/' + locale + (href === '/' ? '' : href);
}

type Props = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string };

/* Links to the home page don't fetch it ahead: its walk-in film (625 KB on a phone) and first picture would start
   downloading on every other page, taking the connection from that page's own photos. It loads on the click. */
const toHome = (href: string) => /^\/(?=[?#]|$)/.test(href);

export function Link({ href, prefetch, ...rest }: Props) {
  return <NextLink href={localize(href, useLocale())} prefetch={prefetch ?? (toHome(href) ? false : undefined)} {...rest} />;
}

/* the address without its language prefix: "/fr/inventory" reads "/inventory" */
export function usePathname(): string {
  const path = useNextPathname() || '/';
  const locale = useLocale();
  if (locale === routing.defaultLocale) return path;
  const rest = path.slice(locale.length + 1);
  return rest === '' ? '/' : rest;
}
