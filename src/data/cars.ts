/* THE CARS. There is one list, in Supabase (the "cars" table), managed on the admin page (admin.html).
   The inventory, the car pages and the windows of the dealership picture all read it through useCars() below,
   so adding or changing a car never means editing code. Sold cars are never sent to visitors. */
import { useEffect, useState } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_KEY_OK, SUPABASE_URL } from '../config';

export type CarStatus = 'available' | 'reserved' | 'sold';
export type CarType = 'Supercars' | 'Sports cars' | 'SUVs';
export interface Spec { label: string; value: string }
export interface Car {
  id: string;                 /* the car's web address name: /car/f8-tributo */
  make: string;
  model: string;
  type: CarType;
  tagline: string | null;
  images: string[];           /* first one is the main photo: a site path (assets/cars/f8.webp) or an uploaded photo's address */
  credit: string | null;
  specs: Spec[];              /* factory specs, in the order shown */
  /* "This car": the exact car on the floor. Empty shows "On request". */
  year: number | null;
  mileage_km: number | null;
  color: string | null;
  previous_owners: number | null;
  service_records: string | null;
  import_papers: string | null;
  price: number | null;       /* US dollars. Empty shows "Price on request". */
  status: CarStatus;
  sample: boolean;
  sort_order: number;
  created_at: string;
}

export const NAME = (c: Pick<Car, 'make' | 'model'>) => c.make + ' ' + c.model;
export const PRICE = (c: Pick<Car, 'price'>) => (c.price == null ? 'Price on request' : '$' + c.price.toLocaleString('en-US'));
export const spec = (c: Car, label: string) => c.specs.find(s => s.label.toLowerCase() === label)?.value;

/* every car that isn't sold, in the showroom's order. The key goes in the address,
   so the browser sends one plain request without checking first. */
export const CARS_URL = SUPABASE_URL + '/rest/v1/cars?select=*&status=neq.sold&order=sort_order.asc,created_at.asc&apikey=' + encodeURIComponent(SUPABASE_ANON_KEY);

export interface CarsState { cars: Car[] | null; failed: boolean }
const STORE = 'milcar-cars';
let current: CarsState = { cars: null, failed: false };
let shown = '';
let checking = false;
const listeners = new Set<(s: CarsState) => void>();
const publish = (s: CarsState) => { current = s; listeners.forEach(l => l(s)); };

/* A copy is kept for this visit, so moving between pages is instant; it is checked again on every page. */
function check() {
  if (!current.cars) {
    try {
      const kept = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      if (kept && Date.now() - kept.t < 6e5) { shown = JSON.stringify(kept.cars); publish({ cars: kept.cars, failed: false }); }
    } catch { /* no copy */ }
  }
  if (checking) return;
  if (!SUPABASE_KEY_OK) { if (!current.cars) publish({ cars: null, failed: true }); return; }
  checking = true;
  const ctl = new AbortController(), late = setTimeout(() => ctl.abort(), 12000);
  fetch(CARS_URL, { signal: ctl.signal })
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Car[]>; })
    .then(cars => {
      try { sessionStorage.setItem(STORE, JSON.stringify({ t: Date.now(), cars })); } catch { /* private mode */ }
      const text = JSON.stringify(cars);
      if (text !== shown) { shown = text; publish({ cars, failed: false }); }
    })
    .catch(() => { if (!current.cars) publish({ cars: null, failed: true }); })
    .finally(() => { clearTimeout(late); checking = false; });
}

/* The cars for a page. It starts empty on every page (exactly like the page as built), then fills in.
   `later` waits until the page has finished loading and the browser is idle (the home page's windows). */
export function useCars(later = false): CarsState {
  const [state, setState] = useState<CarsState>({ cars: null, failed: false });
  useEffect(() => {
    let done = false;
    const go = () => { if (done) return; listeners.add(setState); if (current.cars || current.failed) setState(current); check(); };
    let idle = 0;
    const wait = () => { idle = window.setTimeout(go, 1500); };
    if (!later) go();
    else if (document.readyState === 'complete') wait();
    else addEventListener('load', wait, { once: true });
    return () => { done = true; clearTimeout(idle); removeEventListener('load', wait); listeners.delete(setState); };
  }, [later]);
  return state;
}
