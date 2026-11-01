/* THE CARS IN THE DEALERSHIP PICTURE.
   The cars are part of one picture (assets/dealership.webp), so each window here must match the car standing in it.
   Change a name, year, price or link here freely. Putting a different car in a window needs a new picture.
   id:     must match a car in assets/inventory.js, it decides where the window links to
   name, year, price: shown on the window's label
   image:  a close-up of that car from the same picture, used on phones
   window: 1 to 6, counted from the left of the building */
const FEATURED = [
  { id: 'range-rover-sport-svr', name: 'Range Rover Sport SVR', year: 2019, price: 'Price on request', image: 'assets/featured/range-rover-sport-svr.webp', window: 1 },
  { id: 'huracan-evo',           name: 'Lamborghini Huracán EVO', year: 2020, price: 'Price on request', image: 'assets/featured/huracan-evo.webp', window: 2 },
  { id: 'r8-v10-plus',           name: 'Audi R8 V10 Plus', year: 2017, price: 'Price on request', image: 'assets/featured/r8-v10-plus.webp', window: 3 },
  { id: 'aventador-svj',         name: 'Lamborghini Aventador SVJ', year: 2019, price: 'Price on request', image: 'assets/featured/aventador-svj.webp', window: 4 },
  { id: 'f8-tributo',            name: 'Ferrari F8 Tributo', year: 2020, price: 'Price on request', image: 'assets/featured/f8-tributo.webp', window: 5 },
  { id: 'g63',                   name: 'Mercedes-AMG G 63', year: 2021, price: 'Price on request', image: 'assets/featured/g63.webp', window: 6 }
];

/* Where each glass bay sits on the picture, in percent of its width. */
const WINDOWS = {
  1: { x: 8.89, w: 10.44 },
  2: { x: 22.5, w: 11.5 },
  3: { x: 36.94, w: 11.95 },
  4: { x: 51.94, w: 11.67 },
  5: { x: 66.39, w: 11.5 },
  6: { x: 80.67, w: 10.44 }
};

(function () {
  const front = document.querySelector('[data-front]');
  if (!front) return;
  const part = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const hoverless = matchMedia('(hover: none)');
  const caption = document.querySelector('[data-front-caption]');
  let chosen = null;
  /* on the home page the building waits until the hero has finished loading, then fetches ahead of the visitor */
  const afterHero = front.hasAttribute('data-after-hero');

  const describe = c => c.name + ', ' + c.year;
  const choose = win => {
    if (chosen && chosen !== win) chosen.classList.remove('chosen');
    chosen = win;
    if (win) win.classList.add('chosen');
    if (caption && win) {
      caption.querySelector('[data-name]').textContent = win.dataset.name;
      caption.querySelector('[data-detail]').textContent = win.dataset.detail;
      caption.querySelector('a').href = win.href;
      const pic = caption.querySelector('img');
      if (pic) { pic.src = win.dataset.image; pic.alt = win.dataset.name; }
      caption.classList.add('on');
    }
  };

  FEATURED.forEach(car => {
    const pos = WINDOWS[car.window];
    if (!pos) return;
    const win = part('a', 'win');
    win.href = 'car.html?id=' + encodeURIComponent(car.id);
    win.style.setProperty('--x', pos.x + '%');
    win.style.setProperty('--w', pos.w + '%');
    win.dataset.name = car.name;
    win.dataset.detail = car.year + ' · ' + car.price;
    win.dataset.image = car.image;

    win.setAttribute('aria-label', describe(car) + ', ' + car.price + ', in showroom window ' + car.window + '. View car');
    const inside = part('span', 'win-inside');
    inside.append(part('i', 'win-lit'));

    const label = part('span', 'win-label');
    label.setAttribute('aria-hidden', 'true');
    const name = part('strong'); name.textContent = car.name;
    const detail = part('span'); detail.textContent = win.dataset.detail;
    const go = part('em'); go.textContent = 'View car →';
    label.append(name, detail, go);

    win.append(inside, label);
    /* on a phone the first tap lights the window and shows the car, the second tap opens it */
    win.addEventListener('click', e => {
      if (hoverless.matches && chosen !== win) { e.preventDefault(); choose(win); }
    });
    front.append(win);
  });

  if (afterHero) {
    const fetchAhead = () => front.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(fetchAhead, { timeout: 3000 }) : setTimeout(fetchAhead, 1500));
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  }

})();
