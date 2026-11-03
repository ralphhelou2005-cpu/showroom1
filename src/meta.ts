/* Each page's title, description and sharing picture. The build writes them into each page's HTML
   (WhatsApp and Instagram read them without running any code); the browser updates them while moving between pages. */
import { useEffect } from 'react';
import { NAME, type Car } from './data/cars';

export interface PageMeta { title: string; description: string; shareText: string; image: string }

const HOME: PageMeta = {
  title: 'Milcar | Supercars with the whole story',
  description: 'Milcar Automotive Consultancy. Walk into the showroom, see the whole car and its whole past, and book a private viewing.',
  shareText: 'Every car has a story. We show you all of it.',
  image: 'assets/hero-poster.jpg'
};

export function metaFor(path: string, cars: Car[] = []): PageMeta {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return HOME;
  if (p === '/inventory') {
    const d = 'See the cars in the Milcar showroom and ask for the full history of the one you want.';
    return { title: 'Inventory | Milcar', description: d, shareText: d, image: HOME.image };
  }
  if (p === '/featured') {
    const d = 'The cars in the Milcar showroom windows tonight. Pick a window to see the car.';
    return { title: 'Featured | Milcar', description: d, shareText: d, image: 'assets/dealership-1200.webp' };
  }
  const m = p.match(/^\/car\/([^/]+)$/);
  if (m) {
    const car = cars.find(c => c.id === decodeURIComponent(m[1]));
    if (!car) {
      const d = 'Full specs for this car at Milcar, with its history available on request.';
      return { title: 'Car details | Milcar', description: d, shareText: d, image: HOME.image };
    }
    const d = NAME(car) + (car.tagline ? '. ' + car.tagline : '') + ' Full specs at Milcar, with its history available on request.';
    return { title: NAME(car) + ' | Milcar', description: d, shareText: d, image: car.images[0] || HOME.image };
  }
  const d = 'This page isn’t here. See the cars in the Milcar showroom.';
  return { title: 'Page not found | Milcar', description: d, shareText: d, image: HOME.image };
}

const setMeta = (sel: string, value: string) => { const e = document.head.querySelector<HTMLMetaElement>(sel); if (e) e.content = value; };
export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title;
    setMeta('meta[name=description]', meta.description);
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.shareText);
  }, [meta.title, meta.description, meta.shareText]);
}
