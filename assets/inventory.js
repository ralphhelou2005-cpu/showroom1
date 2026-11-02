/* The stock list comes from Supabase (the "cars" table), and is managed on the admin page.
   Sold cars are never sent to visitors; reserved ones show a "Reserved" tag.
   The "This car" lines are for the exact car on the floor; anything left empty shows "On request". */
const ASK = 'On request';
const THIS_CAR = [
  ['Year', c => c.year],
  ['Mileage', c => c.mileage_km == null ? null : c.mileage_km.toLocaleString('en-US') + ' km'],
  ['Color', c => c.color],
  ['Previous owners', c => c.previous_owners],
  ['Service records', c => c.service_records],
  ['Import papers', c => c.import_papers]
];
/* every photo has an 800 px copy beside it: svj.webp and svj-800.webp */
const small = src => src.replace(/\.(webp|jpe?g|png|avif)$/i, '-800.$1');
const sized = (img, src, sizes) => { img.src = src; img.srcset = small(src) + ' 800w, ' + src + ' 1500w'; img.sizes = sizes; img.width = 1500; img.height = 1000; img.decoding = 'async'; };
const NAME = c => c.make + ' ' + c.model;
const PRICE = c => c.price == null ? 'Price on request' : '$' + c.price.toLocaleString('en-US');
const spec = (c, label) => (c.specs.find(s => s.label.toLowerCase() === label) || {}).value;
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
/* the display face draws 1 and 0 like I and O, so digits in car names and prices use the body face */
const named = (tag, cls, text) => {
  const e = el(tag, cls);
  text.split(/(\d+)/).forEach((part, n) => { if (part) e.append(n % 2 ? el('span', 'num', part) : part); });
  return e;
};

/* ---------- the cars, from Supabase ----------
   A copy is kept for this visit, so moving between pages is instant; it is checked again on every page. */
const STORE = 'milcar-cars';
function withCars(draw, fail) {
  let drawn = null;
  try {
    const kept = JSON.parse(sessionStorage.getItem(STORE));
    if (kept && Date.now() - kept.t < 6e5) { drawn = JSON.stringify(kept.cars); draw(kept.cars); }
  } catch (e) { /* no copy */ }
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_KEY_OK) { if (!drawn) fail(); return; }
  const ctl = new AbortController(), late = setTimeout(() => ctl.abort(), 12000);
  /* the key goes in the address, so the browser sends one plain request without checking first */
  fetch(SUPABASE_URL + '/rest/v1/cars?select=*&status=neq.sold&order=sort_order.asc,created_at.asc&apikey=' + encodeURIComponent(SUPABASE_ANON_KEY), { signal: ctl.signal })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(cars => {
      clearTimeout(late);
      try { sessionStorage.setItem(STORE, JSON.stringify({ t: Date.now(), cars })); } catch (e) { /* private mode */ }
      if (JSON.stringify(cars) !== drawn) draw(cars);
    })
    .catch(() => { clearTimeout(late); if (!drawn) fail(); });
}
const waiting = (where, text) => { where.textContent = ''; where.append(el('p', 'label loading', text)); };
/* Supabase can't be reached: say so politely, with a way forward */
const sorry = where => {
  where.textContent = '';
  const box = el('div', 'offline-note'), row = el('div', 'offline-actions');
  const again = el('button', 'btn', 'Try again'); again.type = 'button'; again.addEventListener('click', () => location.reload());
  const book = el('a', 'btn ghost', 'Book a viewing'); book.href = 'index.html#book';
  row.append(again, book);
  box.append(el('p', 'label', 'The showroom'), el('h2', '', 'We can’t show the cars right now'),
    el('p', '', 'Please try again in a moment, or book a private viewing and we’ll tell you what’s on the floor.'), row);
  where.append(box);
};

/* ---------- the inventory page ---------- */
const grid = document.getElementById('grid');
if (grid) {
  const filters = document.getElementById('filters'), note = document.querySelector('.sample-note');
  let cars = [], current = 'All';
  const card = (car, i, lead) => {
    const a = el('a', 'vehicle' + (lead ? ' lead' : ''));
    a.href = 'car.html?id=' + encodeURIComponent(car.id);
    a.style.animationDelay = i * 70 + 'ms';
    const fig = el('figure');
    if (car.images[0]) {
      const img = el('img'); sized(img, car.images[0], lead ? '(max-width:900px) 100vw, 66vw' : '(max-width:560px) 100vw, (max-width:900px) 50vw, 33vw'); img.alt = NAME(car); if (i > 1) img.loading = 'lazy';
      fig.append(img);
    }
    if (car.sample) fig.append(el('span', 'tag', 'Sample'));
    if (car.status === 'reserved') fig.append(el('span', 'tag reserved', 'Reserved'));
    const row = el('div', 'row');
    row.append(named('span', 'price', PRICE(car)), el('span', 'see', 'View specs'));
    const power = (spec(car, 'power') || '').split(' at ')[0];
    const line = [spec(car, 'engine'), power].filter(Boolean).join(', ') || car.tagline || '';
    a.append(fig, el('p', 'label', car.make), named('h2', '', car.model), el('p', 'spec', line), row);
    return a;
  };
  const show = type => {
    current = type;
    grid.textContent = '';
    cars.filter(c => type === 'All' || c.type === type).forEach((c, i) => grid.append(card(c, i, type === 'All' && i === 0)));
    [...filters.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
  };
  waiting(grid, 'Opening the showroom…');
  withCars(list => {
    cars = list;
    if (note) note.hidden = !cars.some(c => c.sample);
    const types = ['All', ...new Set(cars.map(c => c.type))];
    filters.textContent = '';
    if (!cars.length) { grid.textContent = ''; grid.append(el('p', 'inv-empty', 'New cars are on their way. Book a viewing and we’ll tell you first.')); return; }
    types.forEach(t => {
      const b = el('button', '', t);
      b.type = 'button'; b.dataset.type = t;
      b.addEventListener('click', () => show(t));
      filters.append(b);
    });
    show(types.includes(current) ? current : 'All');
  }, () => { filters.textContent = ''; if (note) note.hidden = true; sorry(grid); });
}

/* ---------- the single car page ---------- */
const detail = document.getElementById('car');
if (detail) {
  const id = new URLSearchParams(location.search).get('id');
  waiting(detail, 'Opening the car…');
  withCars(cars => {
    detail.textContent = '';
    const i = cars.findIndex(c => c.id === id);
    if (i < 0) {
      detail.append(el('h1', 'car-missing', 'We couldn’t find that car.'), el('p', 'car-line', 'It may have been sold. See what’s in the showroom now.'));
      const back = el('a', 'btn', 'Back to the inventory'); back.href = 'inventory.html';
      detail.append(back);
      return;
    }
    const car = cars[i], next = cars.length > 1 ? cars[(i + 1) % cars.length] : null;
    document.title = NAME(car) + ' | Milcar';

    const gallery = el('div', 'gallery');
    const main = el('figure', 'gallery-main');
    if (car.images[0]) {
      const big = el('img'); sized(big, car.images[0], '(max-width:900px) 100vw, 62vw'); big.fetchPriority = 'high'; big.alt = NAME(car);
      main.append(big);
    }
    if (car.sample) main.append(el('span', 'tag', 'Sample listing'));
    if (car.status === 'reserved') main.append(el('span', 'tag reserved', 'Reserved'));
    gallery.append(main);
    if (car.images.length > 1) {
      const thumbs = el('div', 'thumbs');
      car.images.forEach((src, n) => {
        const t = el('button'); t.type = 'button';
        t.setAttribute('aria-label', 'Show photo ' + (n + 1));
        t.setAttribute('aria-pressed', String(n === 0));
        const im = el('img'); im.src = small(src); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
        t.append(im);
        t.addEventListener('click', () => {
          sized(main.querySelector('img'), src, '(max-width:900px) 100vw, 62vw');
          [...thumbs.children].forEach(b => b.setAttribute('aria-pressed', String(b === t)));
        });
        thumbs.append(t);
      });
      gallery.append(thumbs);
    }

    const head = el('div', 'car-head');
    const crumb = el('a', 'crumb', 'All cars'); crumb.href = 'inventory.html';
    const book = el('a', 'btn', 'Book a private viewing');
    book.href = 'index.html?car=' + encodeURIComponent(NAME(car)) + '#book';
    head.append(crumb, el('p', 'label', car.make), named('h1', '', car.model));
    if (car.tagline) head.append(el('p', 'car-line', car.tagline));
    head.append(named('p', 'price', PRICE(car)));
    if (car.status === 'reserved') head.append(el('p', 'car-line', 'This car is reserved. Ask us to hear if it becomes available.'));
    head.append(book);

    const top = el('div', 'car-top');
    top.append(gallery, head);

    const list = (title, rows) => {
      const s = el('section', 'spec-block');
      s.append(el('h2', '', title));
      const dl = el('dl');
      rows.forEach(([k, v]) => { const r = el('div'); r.append(el('dt', '', k), el('dd', '', v)); dl.append(r); });
      s.append(dl);
      return s;
    };
    const blocks = el('div', 'spec-grid');
    if (car.specs.length) blocks.append(list('Factory specs', car.specs.map(s => [s.label, s.value])));
    blocks.append(list('This car', THIS_CAR.map(([k, get]) => { const v = get(car); return [k, v == null || v === '' ? ASK : String(v)]; })));
    detail.append(top, blocks);
    if (car.specs.length) detail.append(el('p', 'spec-note', 'Factory figures are for the model and can vary by year and market. Ask us to confirm them against this car’s papers.'));

    if (next) {
      const on = el('a', 'next-car');
      on.href = 'car.html?id=' + encodeURIComponent(next.id);
      if (next.images[0]) { const nimg = el('img'); nimg.src = small(next.images[0]); nimg.alt = ''; nimg.loading = 'lazy'; nimg.decoding = 'async'; on.append(nimg); }
      const ntext = el('span'); ntext.append(el('span', 'label', 'Next car'), named('strong', '', NAME(next)));
      on.append(ntext);
      detail.append(on);
    }
    if (car.credit) detail.append(el('p', 'credit', 'Photos: ' + car.credit + (car.images.every(s => s.startsWith('assets/')) ? ' on Unsplash' : '')));
  }, () => sorry(detail));
}

document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));
