/* The stock list. To add a car, copy one entry and change its details.
   sample:true shows the "Sample" tag; remove it for a real listing.
   The "thisCar" lines are for the exact car on the floor. */
const ASK = 'On request';
const CARS = [
  { id: 'aventador-svj', make: 'Lamborghini', model: 'Aventador SVJ', type: 'Supercars', sample: true,
    tagline: 'A V12 with nothing to prove.',
    images: ['assets/cars/svj.webp', 'assets/cars/int-lambo.webp'], credit: 'Wes Tindel, Viktor Theo',
    specs: { Engine: '6.5 L naturally aspirated V12', Power: '770 CV at 8,500 rpm', Torque: '720 Nm at 6,750 rpm', Gearbox: '7-speed ISR', Drive: 'All-wheel drive', '0 to 100 km/h': '2.8 seconds', 'Top speed': '350 km/h' } },
  { id: 'huracan-evo', make: 'Lamborghini', model: 'Huracán EVO', type: 'Supercars', sample: true,
    tagline: 'Ten cylinders, four driven wheels.',
    images: ['assets/cars/huracan.webp', 'assets/cars/int-lambo.webp'], credit: 'Krish Parmar, Viktor Theo',
    specs: { Engine: '5.2 L naturally aspirated V10', Power: '640 PS at 8,000 rpm', Torque: '601 Nm at 6,500 rpm', Gearbox: '7-speed dual-clutch', Drive: 'All-wheel drive', '0 to 97 km/h': '2.9 seconds', 'Top speed': '325 km/h' } },
  { id: 'f8-tributo', make: 'Ferrari', model: 'F8 Tributo', type: 'Supercars', sample: true,
    tagline: 'Twin turbos, driven from the rear.',
    images: ['assets/cars/f8.webp', 'assets/cars/int-ferrari.webp'], credit: 'Lance Asper, Franco Debartolo',
    specs: { Engine: '3.9 L twin-turbo V8', Power: '720 PS at 8,000 rpm', Torque: '770 Nm at 3,250 rpm', Gearbox: '7-speed dual-clutch', Drive: 'Rear-wheel drive', '0 to 100 km/h': '2.9 seconds', 'Top speed': '340 km/h' } },
  { id: 'r8-v10-plus', make: 'Audi', model: 'R8 V10 Plus', type: 'Sports cars', sample: true,
    tagline: 'The everyday supercar.',
    images: ['assets/cars/r8.webp', 'assets/cars/r8-2.webp', 'assets/cars/int-audi.webp'], credit: 'Mihail Comanescu, Chris Carzoli',
    specs: { Engine: '5.2 L V10 FSI', Power: '610 PS at 8,250 rpm', Torque: '560 Nm at 6,500 rpm', Gearbox: '7-speed S tronic', Drive: 'All-wheel drive', '0 to 100 km/h': '3.2 seconds', 'Top speed': '330 km/h' } },
  { id: 'g63', make: 'Mercedes-AMG', model: 'G 63', type: 'SUVs', sample: true,
    tagline: 'A square shape with serious power.',
    images: ['assets/cars/g63.webp', 'assets/cars/g63-2.webp'], credit: 'D Panyukov, Alexis AMZ DA CRUZ',
    specs: { Engine: '4.0 L twin-turbo V8', Power: '585 hp', Torque: '850 Nm', Gearbox: '9-speed automatic', Drive: 'All-wheel drive', '0 to 100 km/h': '4.5 seconds', 'Top speed': '220 km/h' } },
  { id: 'range-rover-sport-svr', make: 'Range Rover', model: 'Sport SVR', type: 'SUVs', sample: true,
    tagline: 'Family space, supercharged.',
    images: ['assets/cars/rrs.webp', 'assets/cars/rrs-2.webp'], credit: 'Robin LE MEE, Brecht Denil',
    specs: { Engine: '5.0 L supercharged V8', Power: '575 PS', Torque: '700 Nm', Gearbox: '8-speed automatic', Drive: 'All-wheel drive', '0 to 100 km/h': '4.5 seconds', 'Top speed': '283 km/h' } }
];
const THIS_CAR = ['Year', 'Mileage', 'Color', 'Previous owners', 'Service records', 'Import papers'];
const sized = (img, src, sizes) => { img.src = src; img.srcset = src.replace('.webp', '-800.webp') + ' 800w, ' + src + ' 1500w'; img.sizes = sizes; img.width = 1500; img.height = 1000; img.decoding = 'async'; };
const NAME = c => c.make + ' ' + c.model;
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
/* the display face draws 1 and 0 like I and O, so digits in car names use the body face */
const named = (tag, cls, text) => {
  const e = el(tag, cls);
  text.split(/(\d+)/).forEach((part, n) => { if (part) e.append(n % 2 ? el('span', 'num', part) : part); });
  return e;
};

/* ---------- the inventory page ---------- */
const grid = document.getElementById('grid');
if (grid) {
  const filters = document.getElementById('filters');
  const types = ['All', ...new Set(CARS.map(c => c.type))];
  const card = (car, i, lead) => {
    const a = el('a', 'vehicle' + (lead ? ' lead' : ''));
    a.href = 'car.html?id=' + car.id;
    a.style.animationDelay = i * 70 + 'ms';
    const fig = el('figure');
    const img = el('img'); sized(img, car.images[0], lead ? '(max-width:900px) 100vw, 66vw' : '(max-width:560px) 100vw, (max-width:900px) 50vw, 33vw'); img.alt = NAME(car); if (i > 1) img.loading = 'lazy';
    fig.append(img);
    if (car.sample) fig.append(el('span', 'tag', 'Sample'));
    const row = el('div', 'row');
    row.append(el('span', 'price', 'Price on request'), el('span', 'see', 'View specs'));
    a.append(fig, el('p', 'label', car.make), named('h2', '', car.model), el('p', 'spec', car.specs.Engine + ', ' + car.specs.Power.split(' at ')[0]), row);
    return a;
  };
  const show = type => {
    grid.textContent = '';
    CARS.filter(c => type === 'All' || c.type === type).forEach((c, i) => grid.append(card(c, i, type === 'All' && i === 0)));
    [...filters.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
  };
  types.forEach(t => {
    const b = el('button', '', t);
    b.type = 'button'; b.dataset.type = t;
    b.addEventListener('click', () => show(t));
    filters.append(b);
  });
  show('All');
}

/* ---------- the single car page ---------- */
const detail = document.getElementById('car');
if (detail) {
  const id = new URLSearchParams(location.search).get('id');
  const i = CARS.findIndex(c => c.id === id);
  if (i < 0) {
    detail.append(el('h1', 'car-missing', 'We couldn’t find that car.'));
    const back = el('a', 'btn', 'Back to the inventory'); back.href = 'inventory.html';
    detail.append(back);
  } else {
    const car = CARS[i], next = CARS[(i + 1) % CARS.length];
    document.title = NAME(car) + ' | Milcar';

    const gallery = el('div', 'gallery');
    const main = el('figure', 'gallery-main');
    const big = el('img'); sized(big, car.images[0], '(max-width:900px) 100vw, 62vw'); big.fetchPriority = 'high'; big.alt = NAME(car);
    main.append(big);
    if (car.sample) main.append(el('span', 'tag', 'Sample listing'));
    gallery.append(main);
    if (car.images.length > 1) {
      const thumbs = el('div', 'thumbs');
      car.images.forEach((src, n) => {
        const t = el('button'); t.type = 'button';
        t.setAttribute('aria-label', 'Show photo ' + (n + 1));
        t.setAttribute('aria-pressed', String(n === 0));
        const im = el('img'); im.src = src.replace('.webp', '-800.webp'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
        t.append(im);
        t.addEventListener('click', () => {
          sized(big, src, '(max-width:900px) 100vw, 62vw');
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
    head.append(crumb, el('p', 'label', car.make), named('h1', '', car.model), el('p', 'car-line', car.tagline), el('p', 'price', 'Price on request'), book);

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
    blocks.append(
      list('Factory specs', Object.entries(car.specs)),
      list('This car', THIS_CAR.map(k => [k, ASK]))
    );
    const note = el('p', 'spec-note', 'Factory figures are for the model and can vary by year and market. Ask us to confirm them against this car’s papers.');

    const on = el('a', 'next-car');
    on.href = 'car.html?id=' + next.id;
    const nimg = el('img'); nimg.src = next.images[0].replace('.webp', '-800.webp'); nimg.alt = ''; nimg.loading = 'lazy'; nimg.decoding = 'async';
    const ntext = el('span'); ntext.append(el('span', 'label', 'Next car'), named('strong', '', NAME(next)));
    on.append(nimg, ntext);

    const cred = el('p', 'credit', 'Photos: ' + car.credit + ' on Unsplash');
    detail.append(top, blocks, note, on, cred);
  }
}

document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));
