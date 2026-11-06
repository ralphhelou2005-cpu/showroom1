import { useEffect } from 'react';
import { useLocation } from 'react-router';

/* Counts visits for the new dashboard's Analytics (the platform at milcar-platform.vercel.app): each page seen, each
   car seen, and each tap on a WhatsApp or phone link. No cookies, nothing stored in the browser, and nothing at all
   when the visitor's browser asks not to be tracked. Sent once the page is idle, so it never slows the page or the
   walk-in. The dashboard's server turns each visit into an anonymous code that changes every day. */
const ENDPOINT = import.meta.env.VITE_ANALYTICS_URL || 'https://milcar-platform.vercel.app/api/events';
/* where the visitor came from goes with the first page only: the browser keeps it for the whole visit */
let landed = false;

export default function Analytics() {
  const { pathname, search } = useLocation();   // without /showroom1 (the router's basename)
  useEffect(() => {
    if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const q = new URLSearchParams(search);
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : '';
      referrer = host && host !== location.hostname ? host : undefined;   // only where visitors came from, not this site
    } catch { referrer = undefined; }
    /* as plain text: a simple request, which the browser sends to the dashboard's address without asking it first */
    const send = (body: Record<string, unknown>) => {
      const data = JSON.stringify({ path: pathname, locale: 'en', ...body });
      if (!navigator.sendBeacon?.(ENDPOINT, new Blob([data], { type: 'text/plain;charset=UTF-8' }))) {
        fetch(ENDPOINT, { method: 'POST', body: data, keepalive: true, mode: 'no-cors' }).catch(() => {});
      }
    };
    const count = () => {
      send({ type: 'page_view', referrer: landed ? undefined : referrer, ...Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign'].filter(k => q.get(k)).map(k => [k, q.get(k)!.slice(0, 100)])) });
      landed = true;
      const car = pathname.match(/^\/car\/([a-z0-9-]+)$/);
      if (car) send({ type: 'vehicle_view', slug: car[1] });
    };
    /* an old address (car.html?id=…) moves on to the new one at once: only the page the visitor lands on counts */
    const idle = 'requestIdleCallback' in window ? requestIdleCallback(count, { timeout: 4000 }) : setTimeout(count, 1500);
    const tap = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a) return;
      if (/^https:\/\/wa\.me\//.test(a.href)) send({ type: 'whatsapp_click' });
      else if (a.href.startsWith('tel:')) send({ type: 'phone_click' });
    };
    document.addEventListener('click', tap, { capture: true });
    return () => {
      if ('cancelIdleCallback' in window) cancelIdleCallback(idle as number); else clearTimeout(idle as ReturnType<typeof setTimeout>);
      document.removeEventListener('click', tap, { capture: true });
    };
  }, [pathname]);
  return null;
}
