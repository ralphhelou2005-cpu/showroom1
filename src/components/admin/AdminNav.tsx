'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* the dashboard's pages; each later part of the platform adds its own here when it exists */
const PAGES = [
  ['/admin', 'Overview'],
  ['/admin/team', 'Team'],
  ['/admin/account', 'Your account'],
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 md:flex-col">
        {PAGES.map(([href, label]) => {
          const here = href === '/admin' ? path === '/admin' : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={here ? 'page' : undefined}
                className={'block whitespace-nowrap rounded-full px-4 py-2 text-[14px] tracking-[.06em] no-underline transition-colors md:rounded-xl ' +
                  (here ? 'bg-panel-2 text-champagne-hi shadow-[inset_0_0_0_1px_var(--line)]' : 'text-muted hover:text-ink')}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
