import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { asset } from './media';

/* Each page's title, description and sharing picture (WhatsApp and Instagram read them from the page as built),
   its address in its own language, and the same page in the other two languages for search engines.
   Addresses are made absolute from NEXT_PUBLIC_SITE_URL (metadataBase in the layout). */
export const HOME_TITLE = 'Milcar | Supercars with the whole story';

/* "/inventory" in French is "/fr/inventory"; English keeps the plain address */
export const localPath = (path: string, locale: Locale) => (locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`);

export function pageMeta({ title, description, shareText = description, image = 'assets/hero-poster.jpg', path, locale = 'en' }: {
  title: string; description: string; shareText?: string; image?: string; path: string; locale?: Locale;
}): Metadata {
  const img = image.startsWith('http') || image.startsWith('/') ? image : asset(image);
  const url = localPath(path, locale);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: { en: localPath(path, 'en'), fr: localPath(path, 'fr'), ar: localPath(path, 'ar'), 'x-default': localPath(path, 'en') } },
    openGraph: { type: 'website', siteName: 'Milcar', title, description: shareText, url, images: [img], locale: locale === 'ar' ? 'ar_LB' : locale === 'fr' ? 'fr_FR' : 'en_US' },
    twitter: { card: 'summary_large_image', title, description: shareText, images: [img] },
  };
}
