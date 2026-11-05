'use client';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/link';
import { vars } from './ui';

export interface Window { slug: string; name: string; detail: string; label: string; x: number; w: number }

/* the picture and its six window links. On the home page (afterHero) the picture waits until the walk-in has
   loaded, then fetches ahead of the visitor. */
export default function Front({ afterHero = false, plate, windows, alt, view }: { afterHero?: boolean; plate: { src: string; set: string }; windows: Window[]; alt: string; view: string }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!afterHero) return;
    const ahead = () => { const i = img.current; if (!i) return; i.loading = 'eager'; i.decode?.().catch(() => {}); };
    let id = 0, timer = 0;
    const ric = window.requestIdleCallback as typeof requestIdleCallback | undefined;
    const idle = () => { if (ric) id = ric(ahead, { timeout: 3000 }); else timer = window.setTimeout(ahead, 1500); };
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
    return () => { removeEventListener('load', idle); if (ric && id) cancelIdleCallback(id); clearTimeout(timer); };
  }, [afterHero]);
  return (
    <div className="front-scroll" tabIndex={-1}>
      <div className="front">
        <img ref={img} className="front-plate" src={plate.src} srcSet={plate.set} sizes="100vw" width={2600} height={1103}
          alt={alt}
          {...(afterHero ? { decoding: 'async' as const, loading: 'lazy' as const } : { fetchPriority: 'high' as const })} />
        {windows.map(w => (
          <Link key={w.slug} href={'/car/' + encodeURIComponent(w.slug)} className={'win' + (chosen === w.slug ? ' chosen' : '')}
            style={vars({ '--x': w.x + '%', '--w': w.w + '%' })} data-name={w.name} data-detail={w.detail}
            aria-label={w.label} onClick={() => setChosen(w.slug)}>
            <span className="win-inside"><i className="win-lit" /></span>
            <span className="win-label" aria-hidden="true"><strong>{w.name}</strong><span>{w.detail}</span><em>{view}</em></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
