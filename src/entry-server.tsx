/* Used only by the build (scripts/prerender.mjs): draws each page to HTML ahead of time,
   so visitors and search engines get the content at once, and every page has its own title and sharing tags. */
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import App from './App';
import { CARS_URL, type Car } from './data/cars';
import { asset } from './data/images';
import { metaFor } from './meta';
import { SITE_ORIGIN } from './config';
import { POSTER, POSTER_PHONE } from './components/Hero';

/* the site's folder on the web ("/showroom1"), from `base` in vite.config.ts */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export { CARS_URL, metaFor, asset, POSTER, POSTER_PHONE, SITE_ORIGIN };
export type { Car };

export async function render(url: string): Promise<string> {
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouter location={url} basename={BASE}>
        <App />
      </StaticRouter>
    </StrictMode>
  );
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return html;
}
