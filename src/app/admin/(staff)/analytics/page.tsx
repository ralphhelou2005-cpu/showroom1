import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LEAD_SOURCE } from '@/lib/crm-labels';
import { secretKey } from '@/lib/env.server';
import { requireStaff } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Analytics' };

type Summary = {
  days: number; visitors: number; page_views: number; vehicle_views: number; whatsapp_clicks: number; phone_clicks: number;
  inquiries: number; bookings: number; new_leads: number; leads_won: number;
  by_day: { day: string; visitors: number; views: number }[]; top_cars: { slug: string; name: string; views: number }[];
  sources: { source: string; visitors: number }[]; devices: Record<string, number>; lead_sources: Record<string, number>;
};

/* the website's own figures: visits, cars seen, taps on WhatsApp and phone, inquiries and sales. Real counts only. */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await requireStaff();
  if (me.profile.role !== 'OWNER' && me.profile.role !== 'MANAGER') redirect('/admin');
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('analytics_summary', { p_days: days });
  const s = data as unknown as Summary | null;
  const recording = !!secretKey() && (process.env.ANALYTICS_SALT?.length ?? 0) >= 32;
  const max = Math.max(1, ...(s?.by_day ?? []).map(d => d.visitors));
  const tile = (label: string, value: number, note?: string) => (
    <div className="rounded-3xl bg-panel px-6 py-5 shadow-[inset_0_0_0_1px_var(--line)]"><p className="label m-0">{label}</p><p className="m-0 mt-2 font-body text-[44px] leading-none font-extralight">{value}</p>{note && <p className="m-0 mt-2 text-[13px] text-muted">{note}</p>}</div>
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div><p className="label">The website</p><h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Analytics</h1></div>
        <nav aria-label="Period" className="flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_var(--line)]">
          {[7, 30, 90].map(d => <Link key={d} href={`/admin/analytics?days=${d}`} aria-current={d === days ? 'page' : undefined}
            className={'rounded-full px-4 py-1.5 text-[13px] no-underline ' + (d === days ? 'bg-panel-2 text-champagne-hi' : 'text-muted hover:text-ink')}>{d} days</Link>)}
        </nav>
      </div>
      {!recording && <p className="mt-6 max-w-[70ch] rounded-2xl px-5 py-3 text-[15px] text-champagne-hi shadow-[inset_0_0_0_1px_var(--line-strong)]">Visits aren’t being recorded yet: the server needs ANALYTICS_SALT and SUPABASE_SECRET_KEY (Settings → Connections). Leads are counted already.</p>}
      {error || !s ? <p role="alert" className="mt-8 text-muted">The figures couldn’t be loaded just now.</p> : <>
        <div className="mt-8 [display:grid] gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tile('Visitors', s.visitors, `${s.page_views} pages seen`)}
          {tile('Cars seen', s.vehicle_views)}
          {tile('Taps on WhatsApp or phone', s.whatsapp_clicks + s.phone_clicks, `${s.whatsapp_clicks} WhatsApp · ${s.phone_clicks} phone`)}
          {tile('New leads', s.new_leads, `${s.leads_won} won in these ${s.days} days`)}
        </div>
        <section className="mt-12" aria-labelledby="days"><h2 id="days" className="mb-4 text-[clamp(24px,2.6vw,30px)]">Visitors each day</h2>
          {s.by_day.length === 0 ? <p className="text-muted">No visits recorded in these {s.days} days.</p> : (
            <ol className="m-0 flex h-40 list-none items-end gap-1 p-0" aria-label="Visitors per day">
              {s.by_day.map(d => <li key={d.day} title={`${d.day}: ${d.visitors} visitors, ${d.views} pages`} className="min-w-[4px] flex-1 rounded-t bg-champagne/70" style={{ height: `${Math.max(4, (d.visitors / max) * 100)}%` }}><span className="sr-only">{d.day}: {d.visitors} visitors</span></li>)}
            </ol>)}
        </section>
        <div className="mt-12 [display:grid] gap-10 lg:grid-cols-3">
          <section aria-labelledby="cars"><h2 id="cars" className="mb-3 text-[24px]">Most seen cars</h2>
            {s.top_cars.length === 0 ? <p className="text-muted">None yet.</p> : <ol className="m-0 ps-5">{s.top_cars.map(c => <li key={c.slug}>{c.name} <span className="text-muted">· {c.views}</span></li>)}</ol>}</section>
          <section aria-labelledby="sources"><h2 id="sources" className="mb-3 text-[24px]">Where visitors came from</h2>
            {s.sources.length === 0 ? <p className="text-muted">None yet.</p> : <ul className="m-0 list-none p-0">{s.sources.map(x => <li key={x.source}>{x.source === 'direct' ? 'Typed or bookmarked' : x.source} <span className="text-muted">· {x.visitors}</span></li>)}</ul>}
            {Object.keys(s.devices).length > 0 && <p className="mt-3 text-[14px] text-muted">{Object.entries(s.devices).map(([k, n]) => `${n} on ${k === 'mobile' ? 'a phone' : k === 'tablet' ? 'a tablet' : 'a computer'}`).join(' · ')}</p>}</section>
          <section aria-labelledby="leadsrc"><h2 id="leadsrc" className="mb-3 text-[24px]">Where leads came from</h2>
            {Object.keys(s.lead_sources).length === 0 ? <p className="text-muted">No leads in these {s.days} days.</p> : <ul className="m-0 list-none p-0">{Object.entries(s.lead_sources).sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k}>{LEAD_SOURCE[k as keyof typeof LEAD_SOURCE] ?? k} <span className="text-muted">· {n}</span></li>)}</ul>}</section>
        </div>
      </>}
    </>
  );
}
