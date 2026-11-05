import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { smallBtn } from '@/components/admin/forms';
import { ago, dateTime, shortDateTime, toShowroomInput } from '@/lib/admin-format';
import { ACTIVITY, LEAD_SOURCE, LEAD_STATUS, VIEWING_STATUS } from '@/lib/crm-labels';
import { getLead, listCarOptions, listSalesTeam } from '@/lib/crm';
import { whatsappLink } from '@/lib/labels';
import { requireStaff } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import { deleteLead } from '../actions';
import { BookForm, ContactForm, DangerButton, DeleteNote, LeadForm, NoteForm, PickUp, ViewingActions } from '../forms';

export const metadata: Metadata = { title: 'Lead' };

/* one lead: the customer and how to reach them, its status, notes, history and viewings */
export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  if (me.profile.role === 'INVENTORY_EDITOR') redirect('/admin');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await supabaseServer();
  const [lead, cars, team, rules] = await Promise.all([getLead(id), listCarOptions(), listSalesTeam(),
    supabase.from('site_settings').select('value').eq('key', 'booking.rules').maybeSingle()]);
  if (!lead) notFound();
  const manager = me.profile.role !== 'SALESPERSON';
  const names = new Map(team.map(t => [t.id, t.name]));
  const c = lead.customers!;
  const first = c.full_name.split(' ')[0];
  const wa = c.phone ? whatsappLink(c.phone, `Hello ${first}, this is Milcar${lead.car ? ` about the ${lead.car}` : ''}.`) : null;
  const history = [
    ...lead.lead_activities.filter(a => a.type !== 'note_added').map(a => ({ at: a.occurred_at, who: a.actor_id, text: ACTIVITY[a.type], detail: describe(a.details as Record<string, unknown>, names), note: null as null | { id: string; mine: boolean } })),
    ...lead.lead_notes.map(n => ({ at: n.created_at, who: n.author_id, text: 'Note', detail: n.body, note: { id: n.id, mine: n.author_id === me.id } })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const panel = 'rounded-3xl bg-panel px-[clamp(20px,4vw,32px)] py-[clamp(22px,4vw,28px)] shadow-[inset_0_0_0_1px_var(--line)]';
  const minutes = Number((rules.data?.value as { slot_minutes?: number } | null)?.slot_minutes ?? 60);
  return (
    <>
      <Link href="/admin/leads" className="text-[14px] text-champagne no-underline hover:underline">← Leads</Link>
      <h1 className="mt-4 text-[clamp(34px,5vw,56px)]">{c.full_name}</h1>
      <p className="mt-2 text-muted">{LEAD_STATUS[lead.status]} · {LEAD_SOURCE[lead.source]}{lead.car ? ` · ${lead.car}` : ''} · came in {ago(lead.created_at)}{lead.assigned_to ? ` · with ${names.get(lead.assigned_to) ?? 'a colleague'}` : ' · not assigned'}</p>

      <div className="mt-8 [display:grid] gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="[display:grid] gap-6">
          <section className={panel} aria-labelledby="who">
            <h2 id="who" className="mb-4 text-[clamp(24px,2.6vw,30px)]">How to reach {first}</h2>
            <p className="m-0 text-muted">{[c.phone, c.email].filter(Boolean).join(' · ')}{c.preferred_contact ? ` · prefers ${c.preferred_contact === 'whatsapp' ? 'WhatsApp' : c.preferred_contact}` : ''} · writes in {({ en: 'English', fr: 'French', ar: 'Arabic' } as Record<string, string>)[c.preferred_locale]}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {c.phone && <a className={smallBtn} href={`tel:${c.phone}`}>Call</a>}
              {wa && <a className={smallBtn} href={wa} target="_blank" rel="noopener">WhatsApp</a>}
              {c.email && <a className={smallBtn} href={`mailto:${c.email}`}>Email</a>}
              <Link className={smallBtn} href={`/admin/customers/${c.id}`}>Customer’s page</Link>
            </div>
            {lead.message && <blockquote className="m-0 mt-5 border-s-2 border-line-strong ps-4 text-ink">“{lead.message}”</blockquote>}
          </section>

          <section className={panel} aria-labelledby="viewings">
            <h2 id="viewings" className="mb-4 text-[clamp(24px,2.6vw,30px)]">Viewings</h2>
            {lead.appointments.length === 0 && <p className="text-muted">No viewing yet.</p>}
            <ol className="m-0 mb-6 list-none p-0 [display:grid] gap-4">
              {[...lead.appointments].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(a => (
                <li key={a.id} className="rounded-2xl px-4 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
                  <p className="m-0 text-ink">{shortDateTime(a.starts_at)} <span className="text-muted">· {VIEWING_STATUS[a.status]}{a.assigned_to ? ` · ${names.get(a.assigned_to) ?? ''}` : ''}</span></p>
                  {a.cancelled_reason && <p className="m-0 text-[14px] text-muted">{a.cancelled_reason}</p>}
                  <div className="mt-3"><ViewingActions id={a.id} status={a.status} startsInput={toShowroomInput(a.starts_at)} canConfirm={manager} /></div>
                </li>
              ))}
            </ol>
            <BookForm leadId={lead.id} team={team} defaultMinutes={minutes} />
          </section>

          <section className={panel} aria-labelledby="history">
            <h2 id="history" className="mb-4 text-[clamp(24px,2.6vw,30px)]">Notes and history</h2>
            <div className="[display:grid] gap-6">
              <NoteForm leadId={lead.id} />
              <ContactForm leadId={lead.id} />
            </div>
            <ol className="m-0 mt-6 list-none divide-y divide-line p-0">
              {history.map((h, i) => (
                <li key={i} className="py-3">
                  <p className="m-0 text-[14px] text-muted"><time dateTime={h.at} title={dateTime(h.at)}>{ago(h.at)}</time>{h.who ? ` · ${names.get(h.who) ?? 'A colleague'}` : ' · the website'} · <span className="text-champagne-hi">{h.text}</span>
                    {h.note && (h.note.mine || manager) && <> · <DeleteNote id={h.note.id} /></>}</p>
                  {h.detail && <p className="m-0 mt-1 whitespace-pre-line">{h.detail}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="[display:grid] gap-6 xl:sticky xl:top-8">
          {!lead.assigned_to && me.profile.role === 'SALESPERSON' && <div className={panel}><PickUp id={lead.id} /></div>}
          <div className={panel}>
            <LeadForm lead={{ id: lead.id, status: lead.status, vehicle_id: lead.vehicle_id, assigned_to: lead.assigned_to, next_follow_up: toShowroomInput(lead.next_follow_up_at), lost_reason: lead.lost_reason }}
              cars={cars.filter(x => x.status !== 'sold' || x.id === lead.vehicle_id)} team={team} canAssign={manager} />
          </div>
          {manager && <div className={panel}><DangerButton label="Delete the lead…" confirm="Delete this lead, its notes and history for good? The customer stays." run={deleteLead.bind(null, lead.id)} /></div>}
        </aside>
      </div>
    </>
  );
}

function describe(d: Record<string, unknown>, names: Map<string, string>) {
  if (typeof d.summary === 'string') return d.summary;
  if (d.to && typeof d.to === 'string' && LEAD_STATUS[d.to as keyof typeof LEAD_STATUS]) return `${LEAD_STATUS[d.from as keyof typeof LEAD_STATUS] ?? '—'} → ${LEAD_STATUS[d.to as keyof typeof LEAD_STATUS]}`;
  if ('assigned_to' in d) return d.assigned_to ? `To ${names.get(String(d.assigned_to)) ?? 'a colleague'}` : 'Unassigned';
  if (typeof d.at === 'string') return `For ${shortDateTime(d.at)}`;
  if (typeof d.starts_at === 'string') return shortDateTime(d.starts_at);
  return null;
}
