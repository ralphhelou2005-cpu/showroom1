'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Vehicle } from '@/lib/catalog';
import type { Words } from '@/i18n/words';
import CarCard, { type CardWords } from './CarCard';

type Sort = 'showroom' | 'price-desc' | 'price-asc' | 'year-desc';
const SORT_KEYS: Sort[] = ['showroom', 'price-desc', 'price-asc', 'year-desc'];
export type BrowserWords = { t: Words['inventory']; bodyTypes: Words['bodyTypes']; card: CardWords };

/* The inventory's cars with their filters: body type (as before), brand and order. The choice is kept in the
   address (?type=suv&brand=ferrari&sort=price-desc), so a filtered list can be shared or bookmarked.
   The page arrives with every car drawn; a shared address applies its filters once the page is in the browser. */
export default function InventoryBrowser({ vehicles, words: { t, bodyTypes, card } }: { vehicles: Vehicle[]; words: BrowserWords }) {
  const SORTS: [Sort, string][] = SORT_KEYS.map(k => [k, t.sorts[k]]);
  const [type, setType] = useState('all');
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState<Sort>('showroom');

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('type')) setType(q.get('type')!);
    if (q.get('brand')) setBrand(q.get('brand')!);
    const s = q.get('sort') as Sort | null;
    if (s && SORTS.some(([k]) => k === s)) setSort(s);
  }, []);

  /* the address follows the choice without reloading or scrolling */
  const remember = (next: { type?: string; brand?: string; sort?: Sort }) => {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all' || v === 'showroom') q.delete(k); else q.set(k, v);
    }
    history.replaceState(history.state, '', location.pathname + (q.size ? '?' + q : '') + location.hash);
  };

  const types = useMemo(() => [...new Set(vehicles.map(v => v.bodyType))], [vehicles]);
  const brands = useMemo(() => [...new Map(vehicles.map(v => [v.brandSlug, v.make])).entries()], [vehicles]);
  const curType = type === 'all' || types.includes(type as Vehicle['bodyType']) ? type : 'all';
  const curBrand = brand === 'all' || brands.some(([s]) => s === brand) ? brand : 'all';

  const shown = useMemo(() => {
    const list = vehicles.filter(v => (curType === 'all' || v.bodyType === curType) && (curBrand === 'all' || v.brandSlug === curBrand));
    const by = (f: (v: Vehicle) => number | null, dir: 1 | -1) => [...list].sort((a, b) => {
      const x = f(a), y = f(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;   /* "price on request" and unknown years go last */
      if (y == null) return -1;
      return (x - y) * dir;
    });
    if (sort === 'price-desc') return by(v => v.price, -1);
    if (sort === 'price-asc') return by(v => v.price, 1);
    if (sort === 'year-desc') return by(v => v.year, -1);
    return list;
  }, [vehicles, curType, curBrand, sort]);

  const plain = curType === 'all' && curBrand === 'all' && sort === 'showroom';
  return (
    <>
      <div className="filters" id="filters" role="group" aria-label={t.byType}>
        {vehicles.length > 0 && ['all', ...types].map(ty => {
          const label = ty === 'all' ? t.all : bodyTypes[ty as Vehicle['bodyType']];
          return <button key={ty} type="button" data-type={label} aria-pressed={ty === curType ? 'true' : 'false'} onClick={() => { setType(ty); remember({ type: ty }); }}>{label}</button>;
        })}
      </div>
      {vehicles.length > 1 && (
        <div className="filters filters-more">
          {brands.length > 1 && (
            <div className="filter-group" role="group" aria-label={t.byBrand}>
              {[['all', t.allBrands] as [string, string], ...brands].map(([s, name]) => (
                <button key={s} type="button" data-brand={s} aria-pressed={s === curBrand ? 'true' : 'false'} onClick={() => { setBrand(s); remember({ brand: s }); }}>{name}</button>
              ))}
            </div>
          )}
          <label className="filter-sort">
            <span className="label">{t.order}</span>
            <select value={sort} onChange={e => { const s = e.target.value as Sort; setSort(s); remember({ sort: s }); }}>
              {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
        </div>
      )}
      {/* a new choice draws the cards afresh, so they rise in again as before */}
      <div className="grid" id="grid" key={curType + '|' + curBrand + '|' + sort}>
        {vehicles.length === 0
          ? <p className="inv-empty">{t.empty}</p>
          : shown.length === 0
            ? <p className="inv-empty">{t.none} <button type="button" className="inv-reset" onClick={() => { setType('all'); setBrand('all'); remember({ type: 'all', brand: 'all' }); }}>{t.reset}</button></p>
            : shown.map((v, i) => <CarCard key={v.id} car={v} i={i} lead={plain && i === 0} t={card} />)}
      </div>
    </>
  );
}
