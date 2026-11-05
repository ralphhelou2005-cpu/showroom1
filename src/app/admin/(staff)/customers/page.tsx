import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { smallBtn } from '@/components/admin/forms';
import { ago } from '@/lib/admin-format';
import { OPEN_STATUSES } from '@/lib/crm-labels';
import { listCustomers } from '@/lib/crm';
import { requireStaff } from '@/lib/staff';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  const me = await requireStaff();
  if (me.profile.role === 'INVENTORY_EDITOR') redirect('/admin');
  const sp = await searchParams;
  const all = await listCustomers();
  const q = (sp.q ?? '').trim().toLowerCase();
  const list = all.filter(c => !q || `${c.full_name} ${c.phone} ${c.email}`.toLowerCase().includes(q));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div><p className="label">The people</p><h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Customers</h1></div>
        <a href={'/admin/customers/export' + (q ? `?q=${encodeURIComponent(q)}` : '')} className={smallBtn}>Download as CSV</a>
      </div>
      {sp.deleted && <p role="status" className="mt-6 text-champagne-hi">The customer was deleted.</p>}
      <form method="get" className="mt-8 flex max-w-[520px] items-end gap-3">
        <label className="block flex-1"><span className="label">Search</span><input type="search" name="q" defaultValue={sp.q} placeholder="Name, phone, email" /></label>
        <button type="submit" className={smallBtn}>Find</button>
      </form>
      <p className="mt-5 text-[14px] text-muted">{list.length} of {all.length} {all.length === 1 ? 'customer' : 'customers'}</p>
      {all.length === 0 ? <p className="mt-6 text-muted">No customers yet. Each lead brings its customer.</p> : (
        <ol className="m-0 mt-3 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]">
          {list.map(c => {
            const open = c.leads.filter(l => (OPEN_STATUSES as readonly string[]).includes(l.status)).length;
            const last = c.leads.map(l => l.created_at).sort().at(-1) ?? c.created_at;
            return (
              <li key={c.id} className="py-4">
                <Link href={`/admin/customers/${c.id}`} className="[display:grid] gap-1 text-ink no-underline md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:gap-6">
                  <span className="text-[18px] hover:text-champagne-hi">{c.full_name}</span>
                  <span className="text-[14px] text-muted">{[c.phone, c.email].filter(Boolean).join(' · ')}</span>
                  <span className="text-[14px] text-muted">{c.leads.length} {c.leads.length === 1 ? 'lead' : 'leads'}{open ? `, ${open} open` : ''} · {ago(last)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
