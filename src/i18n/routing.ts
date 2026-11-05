import { defineRouting } from 'next-intl/routing';

/* The site's languages. English keeps today's addresses (/inventory, /car/f8-tributo); French and Arabic live under
   /fr and /ar, with their words in src/i18n/words.ts.
   Visitors are not redirected by their browser language: shared links and search results stay in their language. */
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
});

/* Arabic reads right to left: the whole layout mirrors */
export const dir = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');
