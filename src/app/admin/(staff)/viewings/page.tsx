import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { dayKey, dayLabel, time, toShowroomInput } from '@/lib/admin-format';
import { VIEWING_STATUS } from '@/lib/crm-labels';
import { listSalesTeam, listViewings } from '@/lib/crm';
import { requireStaff } from '@/lib/staff';
import { ViewingActions } from '../leads/forms';

export const metadata: Metadata = { title: 'Viewings' };

/* the private viewings as a diary: requests to approve first, then each day from today, then the last month */
export default async function ViewingsPage() {
  const me = await requireStaff();
  if (me.profile.role === 'INVENTORY_EDITOR') redirect('/admin');
  const [viewings, team] = await Promise.all([listViewings(), listSalesTeam()]);
  const names = new Map(team.map(t => [t.id, t.name]));
  const manager = me.profile.role !== 'SALESPERSON';
  const now = Date.now();
  const toApprove = viewings.filter(v => (v.status === 'requested' || v.status === 'rescheduled') && new Date(v.ends_at).getTime() > now);
  const upcoming = viewings.filter(v => new Date(v.ends_at).getTime() > now && !toApprove.includes(v));
  const past = viewings.filter(v => new Date(v.ends_at).getTime() <= now).reverse();
  const days = new Map<string, typeof upcoming>();
  for (const v of upcoming) days.set(dayKey(v.starts_at), [...(days.get(dayKey(v.starts_at)) ?? []), v]);
  const item = (v: (typeof viewings)[number]) => (
    <li key={v.id} className="[display:grid] gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div>
        <p className="m-0 text-ink"><span className="text-champagne-hi">{time(v.starts_at)}–{time(v.ends_at)}</span> · {v.customers?.full_name}{v.car ? ` · ${v.car}` : ''}</p>
        <p className="m-0 mt-1 text-[14px] text-muted">{VIEWING_STATUS[v.status]}{v.assigned_to ? ` · with ${names.get(v.assigned_to) ?? 'a colleague'}` : ' · nobody assigned'}{v.customers?.phone ? ` · ${v.customers.phone}` : ''}
          {v.lead_id && <> · <Link href={`/admin/leads/${v.lead_id}`} className="text-champagne no-underline hover:underline">the lead</Link></>}</p>
        {v.customer_note && <p className="m-0 mt-1 text-[14px]">“{v.customer_note}”</p>}
        {v.cancelled_reason && <p className="m-0 mt-1 text-[14px] text-muted">{v.cancelled_reason}</p>}
      </div>
      <ViewingActions id={v.id} status={v.status} startsInput={toShowroomInput(v.starts_at)} canConfirm={manager} />
    </li>
  );
  const list = 'm-0 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]';
  return (
    <>
      <p className="label">The diary</p>
      <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Viewings</h1>
      <p className="mt-3 max-w-[70ch] text-muted">Visitors ask for a time on the website within the opening hours (Settings); you book from a lead. Confirming, moving or cancelling emails the customer when email is connected.</p>
      <section className="mt-10" aria-labelledby="approve">
        <h2 id="approve" className="mb-3 text-[clamp(24px,2.6vw,30px)]">To approve</h2>
        {toApprove.length === 0 ? <p className="text-muted">Nothing waiting.</p> : <ol className={list}>{toApprove.map(item)}</ol>}
      </section>
      <section className="mt-10" aria-labelledby="coming">
        <h2 id="coming" className="mb-3 text-[clamp(24px,2.6vw,30px)]">Coming up</h2>
        {days.size === 0 ? <p className="text-muted">No confirmed viewings ahead.</p> : [...days.entries()].map(([k, vs]) => (
          <div key={k} className="mb-6"><h3 className="mb-1 font-body text-[15px] text-muted">{dayLabel(vs[0].starts_at)}</h3><ol className={list}>{vs.map(item)}</ol></div>
        ))}
      </section>
      <section className="mt-10" aria-labelledby="past">
        <h2 id="past" className="mb-3 text-[clamp(24px,2.6vw,30px)]">The last 30 days</h2>
        {past.length === 0 ? <p className="text-muted">None.</p> : <ol className={list}>{past.map(item)}</ol>}
      </section>
    </>
  );
}
