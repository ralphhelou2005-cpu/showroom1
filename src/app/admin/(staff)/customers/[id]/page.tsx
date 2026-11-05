import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { ago, shortDateTime } from '@/lib/admin-format';
import { LEAD_SOURCE, LEAD_STATUS, VIEWING_STATUS } from '@/lib/crm-labels';
import { getCustomer } from '@/lib/crm';
import { requireStaff } from '@/lib/staff';
import { deleteCustomer } from '../../leads/actions';
import { CustomerForm, DangerButton } from '../../leads/forms';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  if (me.profile.role === 'INVENTORY_EDITOR') redirect('/admin');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await getCustomer(id);
  if (!c) notFound();
  const panel = 'mt-8 rounded-3xl bg-panel px-[clamp(20px,4vw,32px)] py-[clamp(22px,4vw,28px)] shadow-[inset_0_0_0_1px_var(--line)]';
  return (
    <>
      <Link href="/admin/customers" className="text-[14px] text-champagne no-underline hover:underline">← Customers</Link>
      <h1 className="mt-4 text-[clamp(34px,5vw,56px)]">{c.full_name}</h1>
      <p className="mt-2 text-muted">A customer since {ago(c.created_at)}{c.marketing_consent && c.consent_at ? ` · agreed to hear about new cars ${ago(c.consent_at)}` : ''}</p>
      <section className={panel} aria-labelledby="details"><h2 id="details" className="mb-6 text-[clamp(24px,2.6vw,30px)]">Details</h2><CustomerForm c={c} /></section>
      <section className={panel} aria-labelledby="leads">
        <h2 id="leads" className="mb-4 text-[clamp(24px,2.6vw,30px)]">Leads</h2>
        <ol className="m-0 list-none divide-y divide-line p-0">
          {[...c.leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(l => (
            <li key={l.id} className="py-3"><Link href={`/admin/leads/${l.id}`} className="text-ink no-underline hover:text-champagne-hi">
              {l.vehicles ? `${l.vehicles.brands?.name ?? ''} ${l.vehicles.model}` : 'No car chosen'}</Link>
              <span className="text-[14px] text-muted"> · {LEAD_STATUS[l.status]} · {LEAD_SOURCE[l.source]} · {ago(l.created_at)}</span></li>
          ))}
        </ol>
        {c.appointments.length > 0 && <>
          <h3 className="mt-6 mb-2 font-body text-[15px] text-muted">Viewings</h3>
          <ul className="m-0 list-none p-0">{[...c.appointments].sort((a, b) => b.starts_at.localeCompare(a.starts_at)).map(a => <li key={a.id} className="text-[15px]">{shortDateTime(a.starts_at)} · {VIEWING_STATUS[a.status]}</li>)}</ul>
        </>}
      </section>
      {me.profile.role !== 'SALESPERSON' && (
        <div className="mt-8"><DangerButton label="Delete the customer…" confirm="Delete this customer, all their leads, notes and viewings for good?" run={deleteCustomer.bind(null, c.id)} /></div>
      )}
    </>
  );
}
