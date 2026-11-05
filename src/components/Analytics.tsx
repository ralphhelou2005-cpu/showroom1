'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/* Tells the website's own analytics (src/app/api/events) about each page seen, each car seen, and each tap on a
   WhatsApp or phone link. No cookies, nothing stored in the browser, and nothing at all when the visitor's browser
   asks not to be tracked. Sent once the page is idle, so it never slows the page. */
export default function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const locale = (path.match(/^\/(fr|ar)(\/|$)/)?.[1] ?? 'en') as 'en' | 'fr' | 'ar';
    const bare = path.replace(/^\/(fr|ar)(?=\/|$)/, '') || '/';
    const q = new URLSearchParams(location.search);
    let referrer: string | undefined;
    try { referrer = document.referrer ? new URL(document.referrer).hostname : undefined; } catch { referrer = undefined; }
    const send = (body: Record<string, unknown>) => {
      const data = JSON.stringify({ path: bare, locale, ...body });
      if (!navigator.sendBeacon?.('/api/events', new Blob([data], { type: 'application/json' }))) fetch('/api/events', { method: 'POST', body: data, keepalive: true }).catch(() => {});
    };
    const idle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 1500));
    idle(() => {
      send({ type: 'page_view', referrer, ...Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign'].filter(k => q.get(k)).map(k => [k, q.get(k)!.slice(0, 100)])) });
      const car = bare.match(/^\/car\/([a-z0-9-]+)$/);
      if (car) send({ type: 'vehicle_view', slug: car[1] });
    });
    const tap = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a) return;
      if (/^https:\/\/wa\.me\//.test(a.href)) send({ type: 'whatsapp_click' });
      else if (a.href.startsWith('tel:')) send({ type: 'phone_click' });
    };
    document.addEventListener('click', tap, { capture: true });
    return () => document.removeEventListener('click', tap, { capture: true });
  }, [path]);
  return null;
}
