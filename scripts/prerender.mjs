/* Last build step: write every page as finished HTML, so it shows at once, search engines read it,
   and WhatsApp and Instagram find each page's own title, description and picture.
   - /, /inventory, /featured, and /car/<id> for every car listed in Supabase at build time
   - each page twice (inventory.html and inventory/index.html) so GitHub Pages serves /inventory either way
   - 404.html: the site itself, for any other address (a car added since the last build still opens) */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist/';
const ssr = await import(pathToFileURL('dist-ssr/entry-server.js').href);
/* the site's address comes from vite.config.ts (base) and src/config.ts (SITE_ORIGIN) */
const BASE = ssr.BASE, SITE = ssr.SITE_ORIGIN;
const template = readFileSync(DIST + 'index.html', 'utf8');
for (const mark of ['<!--app-->', '<!--page-head-->', '<!--page-data-->']) if (!template.includes(mark)) throw new Error('index.html lost ' + mark);

let cars = [];
try {
  const r = await fetch(ssr.CARS_URL, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  cars = await r.json();
  console.log(`prerender: ${cars.length} cars from Supabase`);
} catch (e) {
  console.warn('prerender: could not read the cars from Supabase (' + e.message + '); car pages will be drawn in the browser');
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const full = path => (/^https?:/.test(path) ? path : SITE + ssr.asset(path));

function page(path, appHtml) {
  const m = ssr.metaFor(path, cars), url = SITE + BASE + (path === '/' ? '/' : path);
  /* the pages arrive drawn, so their pictures come before the code; the home page's code starts the walk-in,
     and 404.html is drawn by its code, so those go first */
  const code = (html) => (path === '/' || !appHtml ? html : html.replace(/<(script type="module"|link rel="modulepreload") crossorigin/g, '<$1 fetchpriority="low" crossorigin'));
  let head = `<link rel="canonical" href="${esc(url)}">`;
  /* pages that show cars start connecting to Supabase at once (the home page asks only once it has loaded) */
  if (path !== '/') head += `\n<link rel="preconnect" href="${new URL(ssr.CARS_URL).origin}" crossorigin>`;
  if (path === '/') {
    head += `\n<link rel="preload" as="image" href="${ssr.POSTER}" media="(min-aspect-ratio: 7/10)" fetchpriority="high">\n<link rel="preload" as="image" href="${ssr.POSTER_PHONE}" media="(max-aspect-ratio: 7/10)" fetchpriority="high">`;
    /* the light walk-in film starts downloading with the page, as it did before React: the walk-in picks it up when its code is ready.
       Phones (narrower than 7:10) get the phone cut, like src/lib/home.ts */
    head += `\n<link rel="preload" as="fetch" href="${BASE}/assets/walk/fast.mp4" media="(min-aspect-ratio: 7/10)" crossorigin>\n<link rel="preload" as="fetch" href="${BASE}/assets/walk/fast-phone.mp4" media="(max-aspect-ratio: 7/10)" crossorigin>`;
  }
  return code(template)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(m.description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(m.title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(m.shareText)}`)
    .replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(full(m.image))}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(url)}`)
    .replace('<!--page-head-->', head)
    /* the address this page was built for: the browser takes over the HTML only there */
    .replace('<div id="root">', appHtml ? `<div id="root" data-path="${esc(path)}">` : '<div id="root">')
    .replace('<!--app-->', appHtml)
    .replace('<!--page-data-->', '');
}
const write = (file, html) => { mkdirSync(dirname(DIST + file), { recursive: true }); writeFileSync(DIST + file, html); };

const paths = ['/', '/inventory', '/featured', ...cars.map(c => '/car/' + encodeURIComponent(c.id))];
for (const path of paths) {
  const html = page(path, await ssr.render(BASE + path));
  if (path === '/') write('index.html', html);
  else { write(path.slice(1) + '.html', html); write(path.slice(1) + '/index.html', html); }
}
/* any other address: the site draws the page in the browser */
write('404.html', page('/missing', '').replace(/<link rel="canonical"[^>]*>\n?/, '')
  .replace(/<title>[^<]*<\/title>/, '<title>Milcar</title>'));
rmSync('dist-ssr', { recursive: true, force: true });
console.log(`prerender: wrote ${paths.length} pages and 404.html`);
