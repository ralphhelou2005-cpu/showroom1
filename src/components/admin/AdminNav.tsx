'use client';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/roles';

/* the dashboard's pages, each for the roles that use it; each later part of the platform adds its own here */
const PAGES: [href: string, label: string, roles?: Role[]][] = [
  ['/admin', 'Overview'],
  ['/admin/leads', 'Leads', ['OWNER', 'MANAGER', 'SALESPERSON']],
  ['/admin/viewings', 'Viewings', ['OWNER', 'MANAGER', 'SALESPERSON']],
  ['/admin/customers', 'Customers', ['OWNER', 'MANAGER', 'SALESPERSON']],
  ['/admin/inventory', 'Inventory'],
  ['/admin/brands', 'Brands', ['OWNER', 'MANAGER', 'INVENTORY_EDITOR']],
  ['/admin/analytics', 'Analytics', ['OWNER', 'MANAGER']],
  ['/admin/team', 'Team'],
  ['/admin/settings', 'Settings', ['OWNER', 'MANAGER']],
  ['/admin/account', 'Your account'],
];

/* a dot that pulses beside the link just clicked, from the click until its page is ready */
function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={'ms-2 inline-block size-1.5 rounded-full bg-champagne align-middle transition-opacity ' + (pending ? 'animate-pulse opacity-100' : 'opacity-0')} />;
}

export default function AdminNav({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 md:flex-col">
        {PAGES.filter(([, , roles]) => !roles || roles.includes(role)).map(([href, label]) => {
          const here = href === '/admin' ? path === '/admin' : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={here ? 'page' : undefined}
                className={'block whitespace-nowrap rounded-full px-4 py-2 text-[14px] tracking-[.06em] no-underline transition-colors md:rounded-xl ' +
                  (here ? 'bg-panel-2 text-champagne-hi shadow-[inset_0_0_0_1px_var(--line)]' : 'text-muted hover:text-ink')}>
                {label}<Pending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
