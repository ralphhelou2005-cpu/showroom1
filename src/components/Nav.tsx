'use client';
import { Link, usePathname } from '@/i18n/link';
import type { Words } from '@/i18n/words';
import { HomeLink } from './ui';

/* On the home page the nav starts clear over the walk-in and turns solid when the website rises (src/lib/home.ts);
   everywhere else it is solid. Phones keep only the last two links. */
export default function Nav({ t }: { t: Words['nav'] }) {
  const pathname = usePathname();
  const home = pathname === '/';
  const current = (match: boolean) => (match ? { 'aria-current': 'page' as const } : {});
  return (
    <nav className={home ? 'nav' : 'nav solid'} id="nav" aria-label="Main">
      <HomeLink id="top" home={home} className="wordmark">Milcar<small>{t.tagline}</small></HomeLink>
      <ul>
        <li><Link href="/featured" {...current(pathname === '/featured')}>{t.featured}</Link></li>
        <li><HomeLink id="promise" home={home}>{t.promise}</HomeLink></li>
        <li><HomeLink id="build" home={home}>{t.build}</HomeLink></li>
        <li><HomeLink id="questions" home={home}>{t.questions}</HomeLink></li>
        <li><Link href="/inventory" {...current(pathname === '/inventory' || pathname.startsWith('/car/'))}>{t.inventory}</Link></li>
        <li><HomeLink id="book" home={home} className="btn">{t.book}</HomeLink></li>
      </ul>
    </nav>
  );
}
