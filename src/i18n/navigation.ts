import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/* Server-side navigation that keeps the visitor's language: redirect('/inventory') goes to /fr/inventory in French.
   For links in pages, use src/i18n/link.tsx, which keeps the translation library out of the browser's script. */
export const { redirect, getPathname } = createNavigation(routing);
