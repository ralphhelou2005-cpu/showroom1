import { defineRouting } from 'next-intl/routing';

/* The three languages. English keeps today's addresses (/inventory, /car/f8-tributo); French and Arabic
   live under /fr and /ar. Visitors are not redirected by their browser language yet: shared links and
   search results stay in the language they were made in (revisited with the full translations in Phase 8). */
export const routing = defineRouting({
  locales: ['en', 'fr', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

/* Arabic reads right to left: the whole layout mirrors */
export const dir = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');
