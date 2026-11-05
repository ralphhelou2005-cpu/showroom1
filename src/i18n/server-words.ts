import 'server-only';
import { getLocale } from 'next-intl/server';
import { LOCALES, type Locale } from './routing';
import { WORDS } from './words';

/* the words of the page's language, for server components (the page has set its language with setRequestLocale) */
export async function getWords() {
  const l = await getLocale();
  const locale = ((LOCALES as readonly string[]).includes(l) ? l : 'en') as Locale;
  return { w: WORDS[locale], locale };
}

/* what a car card needs (cards are drawn in the browser on the inventory) */
export const cardWords = (w: (typeof WORDS)['en'], locale: Locale) =>
  ({ sampleTag: w.inventory.sampleTag, reserved: w.inventory.reserved, specs: w.inventory.specs, priceOnRequest: w.common.priceOnRequest, locale });
