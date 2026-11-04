import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/* links and redirects that keep the visitor's language: <Link href="/inventory"> goes to /fr/inventory in French */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
