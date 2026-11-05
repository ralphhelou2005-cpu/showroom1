import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { selectClass, smallBtn } from '@/components/admin/forms';
import { ago, shortDateTime } from '@/lib/admin-format';
import { LEAD_SOURCE, LEAD_STATUS, OPEN_STATUSES } from '@/lib/crm-labels';
import { listLeads, listSalesTeam } from '@/lib/crm';
import { requireStaff } from '@/lib/staff';

export const metadata: Metadata = { title: 'Leads' };

type Q = { status?: string; who?: string; source?: string; q?: string; deleted?: string };

/* every lead the person may see, newest first, filtered from the address so a view can be shared */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<Q> }) {
  const me = await requireStaff();
  if (me.profile.role === 'INVENTORY_EDITOR') redirect('/admin');
  const sp = await searchParams;
  const [leads, team] = await Promise.all([listLeads(), listSalesTeam()]);
  const names = new Map(team.map(t => [t.id, t.name]));
  const status = sp.status ?? 'open', who = sp.who ?? 'all', source = sp.source ?? 'all', q = (sp.q ?? '').trim().toLowerCase();
  const now = Date.now();
  const shown = leads.filter(l =>
    (status === 'all' || (status === 'open' ? (OPEN_STATUSES as readonly string[]).includes(l.status) : status === 'due' ? (OPEN_STATUSES as readonly string[]).includes(l.status) && !!l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() <= now : l.status === status)) &&
    (who === 'all' || (who === 'mine' ? l.assigned_to === me.id : who === 'unassigned' ? !l.assigned_to : l.assigned_to === who)) &&
    (source === 'all' || l.source === source) &&
    (!q || `${l.customers?.full_name} ${l.customers?.phone} ${l.customers?.email} ${l.car}`.toLowerCase().includes(q)));
  const exportHref = '/admin/leads/export?' + new URLSearchParams(Object.entries({ status, who, source, q }).filter(([, v]) => v && v !== 'all') as [string, string][]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div><p className="label">Customers’ interest</p><h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Leads</h1></div>
        <div className="flex flex-wrap gap-3">
          <a href={exportHref} className={smallBtn}>Download as CSV</a>
          <Link href="/admin/leads/new" className="btn mt-0">Add a lead</Link>
        </div>
      </div>
      {sp.deleted && <p role="status" className="mt-6 text-champagne-hi">The lead was deleted.</p>}
      <form className="mt-8 [display:grid] gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end" method="get">
        <label className="block"><span className="label">Search</span><input type="search" name="q" defaultValue={sp.q} placeholder="Name, phone, car" /></label>
        <label className="block"><span className="label">Status</span>
          <select name="status" defaultValue={status} className={selectClass}>
            <option value="open">Open</option><option value="due">Follow-up due</option><option value="all">All</option>
            {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="block"><span className="label">Whose</span>
          <select name="who" defaultValue={who} className={selectClass}>
            <option value="all">Everyone’s</option><option value="mine">Mine</option><option value="unassigned">Not assigned</option>
            {me.profile.role !== 'SALESPERSON' && team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>
        <label className="block"><span className="label">Source</span>
          <select name="source" defaultValue={source} className={selectClass}>
            <option value="all">All</option>{Object.entries(LEAD_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <button type="submit" className={smallBtn}>Show</button>
      </form>
      <p className="mt-5 text-[14px] text-muted">{shown.length} of {leads.length} {leads.length === 1 ? 'lead' : 'leads'}</p>
      {leads.length === 0 ? (
        <p className="mt-6 text-muted">No leads yet. Requests from the website’s booking form arrive here, and you can add leads from calls, WhatsApp or walk-ins.</p>
      ) : (
        <ol className="m-0 mt-3 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]">
          {shown.map(l => {
            const due = l.next_follow_up_at && (OPEN_STATUSES as readonly string[]).includes(l.status) && new Date(l.next_follow_up_at).getTime() <= now;
            return (
              <li key={l.id} className="py-4">
                <Link href={`/admin/leads/${l.id}`} className="[display:grid] gap-1 text-ink no-underline md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-6">
                  <span><span className="text-[18px] hover:text-champagne-hi">{l.customers?.full_name}</span><span className="block text-[14px] text-muted">{l.car ?? 'No car chosen'}{l.message ? ` · “${l.message.slice(0, 60)}${l.message.length > 60 ? '…' : ''}”` : ''}</span></span>
                  <span className="text-[14px] text-muted"><span className="text-champagne-hi">{LEAD_STATUS[l.status]}</span> · {LEAD_SOURCE[l.source]} · {l.assigned_to ? names.get(l.assigned_to) ?? 'Assigned' : 'Not assigned'}</span>
                  <span className="text-[14px] text-muted">{due ? <span className="rounded-full bg-[rgba(200,32,42,.16)] px-3 py-0.5 text-ink shadow-[inset_0_0_0_1px_rgba(200,32,42,.5)]">Follow up {ago(l.next_follow_up_at!)}</span>
                    : l.next_follow_up_at ? `Follow up ${shortDateTime(l.next_follow_up_at)}` : `Came in ${ago(l.created_at)}`}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
