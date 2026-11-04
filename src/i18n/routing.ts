import { defineRouting } from 'next-intl/routing';

/* The site's languages. English keeps today's addresses (/inventory, /car/f8-tributo); French and Arabic will live
   under /fr and /ar. They open in Phase 8 with their full translations (messages/fr.json, messages/ar.json);
   until then only English is served, so /fr and /ar show the "page not found" page rather than half-translated pages.
   Visitors are not redirected by their browser language: shared links and search results stay in their language. */
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: ['en'] satisfies Locale[],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
});

/* Arabic reads right to left: the whole layout mirrors */
export const dir = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');
