'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { selectClass, smallBtn } from '@/components/admin/forms';
import type { InventoryRow } from '@/lib/inventory';
import { formatPrice } from '@/lib/labels';
import { PUBLICATION_LABEL, STATUS_LABEL } from '@/lib/vehicle-form';
import { moveVehicle } from './actions';

/* The cars in the showroom's order, which is the website's order too. Search and two filters narrow the list;
   the arrows move a car in the order (only without a search or filter, so "up" always means the next car up). */
export default function InventoryList({ cars, canEdit }: { cars: InventoryRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [shown, setShown] = useState('all');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => cars.filter(c =>
    (shown === 'all' || c.publication === shown) && (status === 'all' || c.status === status) &&
    (!q.trim() || `${c.name} ${c.brand} ${c.year ?? ''} ${c.slug}`.toLowerCase().includes(q.trim().toLowerCase()))), [cars, q, shown, status]);
  const filtered = list.length !== cars.length;

  const move = (id: string, d: 'up' | 'down') => start(async () => {
    setError(null);
    const r = await moveVehicle(id, d);
    if (!r.ok) setError(r.error); else router.refresh();
  });

  const chip = 'rounded-full px-3 py-0.5 text-[12.5px] shadow-[inset_0_0_0_1px_var(--line-strong)]';
  return (
    <>
      <div className="mt-8 [display:grid] gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block"><span className="label">Search</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Brand, model, year" /></label>
        <label className="block"><span className="label">Shown</span>
          <select className={selectClass} value={shown} onChange={e => setShown(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(PUBLICATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="block"><span className="label">Status</span>
          <select className={selectClass} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
      </div>
      <p className="mt-5 text-[14px] text-muted" aria-live="polite">{filtered ? `${list.length} of ${cars.length} cars` : `${cars.length} ${cars.length === 1 ? 'car' : 'cars'}, in the website’s order`}</p>
      {error && <p role="alert" className="mt-3 text-ink">{error}</p>}

      {cars.length === 0 ? (
        <p className="mt-8 text-muted">No cars yet.{canEdit ? ' Add the first one with “Add a car”.' : ''}</p>
      ) : list.length === 0 ? (
        <p className="mt-8 text-muted">No car matches. <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-body text-[16px] text-champagne underline" onClick={() => { setQ(''); setShown('all'); setStatus('all'); }}>Show every car</button></p>
      ) : (
        <ol className="m-0 mt-4 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]">
          {list.map(c => {
            const i = cars.indexOf(c);
            return (
              <li key={c.id} className="[display:grid] grid-cols-[88px_minmax(0,1fr)] items-center gap-x-5 gap-y-3 py-4 md:grid-cols-[120px_minmax(0,1fr)_auto]">
                <Link href={`/admin/inventory/${c.id}`} className="block aspect-[3/2] overflow-hidden rounded-xl bg-panel-2" tabIndex={-1} aria-hidden="true">
                  {c.thumb && <img src={c.thumb} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                </Link>
                <div className="min-w-0">
                  <Link href={`/admin/inventory/${c.id}`} className="text-[18px] text-ink no-underline hover:text-champagne-hi">{c.name}</Link>
                  <p className="m-0 mt-1 text-[14px] text-muted">{[c.year, formatPrice(c.price, c.currency), `${c.photos} ${c.photos === 1 ? 'photo' : 'photos'}${c.videos ? `, ${c.videos} ${c.videos === 1 ? 'video' : 'videos'}` : ''}`].filter(Boolean).join(' · ')}</p>
                  <p className="m-0 mt-2 flex flex-wrap gap-2 text-ink">
                    <span className={chip + (c.publication === 'published' ? ' text-champagne-hi' : '')}>{PUBLICATION_LABEL[c.publication]}</span>
                    {c.status !== 'available' && <span className={chip}>{STATUS_LABEL[c.status]}</span>}
                    {c.isFeatured && <span className={chip}>Featured{c.featuredRank ? ` · ${c.featuredRank}` : ''}</span>}
                    {c.isSample && <span className={chip + ' text-muted'}>Sample</span>}
                  </p>
                </div>
                {canEdit && (
                  <div className="col-span-2 flex gap-2 md:col-span-1">
                    <button type="button" className={smallBtn + ' px-3'} aria-label={`Move ${c.name} up`} disabled={pending || filtered || i === 0} onClick={() => move(c.id, 'up')}>↑</button>
                    <button type="button" className={smallBtn + ' px-3'} aria-label={`Move ${c.name} down`} disabled={pending || filtered || i === cars.length - 1} onClick={() => move(c.id, 'down')}>↓</button>
                    <Link href={`/admin/inventory/${c.id}`} className={smallBtn}>Edit</Link>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
