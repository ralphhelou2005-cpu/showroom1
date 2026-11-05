import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ago, dateTime, greeting, today } from '@/lib/admin-format';
import { displayName, requireStaff, ROLE_LABEL, ROLES, type Role } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Overview' };

type Overview = {
  inventory: Record<'on_sale' | 'reserved' | 'sold' | 'drafts' | 'archived' | 'featured' | 'samples', number>;
  leads: Record<'open' | 'new' | 'mine' | 'unassigned' | 'due' | 'won_30d', number>;
  viewings: Record<'to_approve' | 'today' | 'next_7_days', number>;
  team: { active: number; by_role: Partial<Record<Role, number>> };
  recent: { changed_at: string; from_status: string | null; to_status: string; from_publication: string | null; to_publication: string; vehicle: string; slug: string; changed_by: string | null }[];
};

const ROLE_PLURAL: Record<Role, string> = { OWNER: 'owners', MANAGER: 'managers', SALESPERSON: 'salespeople', INVENTORY_EDITOR: 'inventory editors' };
const STATUS: Record<string, string> = { available: 'Available', reserved: 'Reserved', sold: 'Sold', draft: 'Draft', published: 'Published', archived: 'Archived' };
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/* the dashboard's first page: today's numbers, each counted under the person's own rules (see part 12) */
export default async function OverviewPage() {
  const me = await requireStaff();
  const role = me.profile.role;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('dashboard_overview');
  const sales = role !== 'INVENTORY_EDITOR';
  const first = displayName(me.profile).split(/[\s@]/)[0];

  return (
    <>
      <p className="label">{today()}</p>
      <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">{greeting()}, {first}.</h1>
      {error || !data ? (
        <p role="alert" className="mt-8 text-muted">The figures couldn’t be loaded just now. Refresh the page in a moment.</p>
      ) : (
        <Figures o={data as unknown as Overview} role={role} sales={sales} />
      )}
    </>
  );
}

function Figures({ o, role, sales }: { o: Overview; role: Role; sales: boolean }) {
  const i = o.inventory, l = o.leads, v = o.viewings;
  const managers = role === 'OWNER' || role === 'MANAGER';
  return (
    <>
      {managers && i.samples > 0 && (
        <p className="mt-8 max-w-[70ch] rounded-2xl px-5 py-3 text-[15px] text-champagne-hi shadow-[inset_0_0_0_1px_var(--line-strong)]">
          {plural(i.samples, 'car')} on the website {i.samples === 1 ? 'is a sample' : 'are samples'} with stock photos, shown as “Sample”.
        </p>
      )}
      <div className="mt-10 [display:grid] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="On sale" value={i.on_sale} note={`${plural(i.reserved, 'reserved car')} · ${plural(i.drafts, 'draft')} · ${i.sold} sold`}
          foot={<a href="/inventory" target="_blank" rel="noopener">See them on the website ↗</a>} />
        {sales && (
          <Tile label={role === 'SALESPERSON' ? 'Your open leads' : 'Open leads'} value={role === 'SALESPERSON' ? l.mine : l.open}
            note={l.open === 0 ? 'No leads yet.' : [
              plural(l.new, 'new lead'), role === 'SALESPERSON' ? `${l.unassigned} to pick up` : `${l.unassigned} unassigned`,
              plural(l.won_30d, 'sale') + ' in the last 30 days',
            ].join(' · ')}
            alert={l.due > 0 ? `${plural(l.due, 'follow-up')} due` : undefined}
            foot={<Link href={l.due > 0 ? '/admin/leads?status=due' : '/admin/leads'}>{l.due > 0 ? 'See who to follow up' : 'See the leads'}</Link>} />
        )}
        {sales && (
          <Tile label="Viewings" value={v.next_7_days}
            note={v.next_7_days + v.to_approve === 0 ? 'None booked in the next 7 days.' : `In the next 7 days · ${v.today} today`}
            alert={managers && v.to_approve > 0 ? `${plural(v.to_approve, 'request')} to approve` : undefined}
            foot={<Link href='/admin/viewings'>See the diary</Link>} />
        )}
        <Tile label="Team" value={o.team.active}
          note={ROLES.filter(r => o.team.by_role[r]).map(r => o.team.by_role[r] === 1 ? `1 ${ROLE_LABEL[r].toLowerCase()}` : `${o.team.by_role[r]} ${ROLE_PLURAL[r]}`).join(' · ')}
          foot={<Link href="/admin/team">{role === 'OWNER' ? 'Invite and manage' : 'See the team'}</Link>} />
      </div>

      <section className="mt-14" aria-labelledby="recent">
        <h2 id="recent" className="text-[clamp(26px,3vw,34px)]">Latest changes to the cars</h2>
        {o.recent.length === 0 ? (
          <p className="mt-4 text-muted">No changes yet. Each time a car is reserved, sold, published or taken down, it appears here.</p>
        ) : (
          <ol className="mt-6 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]">
            {o.recent.map(r => (
              <li key={r.changed_at + r.slug} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                <p className="m-0"><span className="text-ink">{r.vehicle}</span> <span className="text-muted">· {change(r)}</span></p>
                <p className="m-0 text-[14px] text-muted"><time dateTime={r.changed_at} title={dateTime(r.changed_at)}>{ago(r.changed_at)}</time>{r.changed_by ? `, by ${r.changed_by}` : ''}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function change(r: Overview['recent'][number]) {
  const parts: string[] = [];
  if (r.from_publication == null && r.from_status == null) return `added as ${STATUS[r.to_publication].toLowerCase()}, ${STATUS[r.to_status].toLowerCase()}`;
  if (r.from_publication !== r.to_publication) parts.push(`${STATUS[r.from_publication ?? 'draft']} → ${STATUS[r.to_publication]}`);
  if (r.from_status !== r.to_status) parts.push(`${STATUS[r.from_status ?? 'available']} → ${STATUS[r.to_status]}`);
  return parts.join(', ') || 'updated';
}

function Tile({ label, value, note, alert, foot }: { label: string; value: number; note: string; alert?: string; foot?: ReactNode }) {
  return (
    <div className="flex flex-col rounded-3xl bg-panel px-6 py-6 shadow-[inset_0_0_0_1px_var(--line)]">
      <p className="label m-0">{label}</p>
      <p className="mt-3 mb-0 font-body text-[56px] leading-none font-extralight text-ink">{value}</p>
      <p className="mt-3 mb-0 text-[14px] leading-snug text-muted">{note}</p>
      {alert && <p className="mt-3 mb-0 inline-flex w-fit rounded-full bg-[rgba(200,32,42,.16)] px-3 py-1 text-[13px] text-ink shadow-[inset_0_0_0_1px_rgba(200,32,42,.5)]">{alert}</p>}
      {foot && <p className="mt-auto mb-0 pt-5 text-[14px] [&_a]:text-champagne [&_a]:no-underline [&_a:hover]:underline">{foot}</p>}
    </div>
  );
}
