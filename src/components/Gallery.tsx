'use client';
import { useState } from 'react';
import type { GalleryItem } from '@/lib/catalog';
import type { Words } from '@/i18n/words';

/* a car's photos and videos: the large one, and the thumbnails that choose it (a video plays in place, with its
   controls; a car without videos looks exactly as before) */
export default function Gallery({ items, name, sample, reserved, t }: { items: GalleryItem[]; name: string; sample: boolean; reserved: boolean; t: Words['car']['gallery'] }) {
  const [at, setAt] = useState(0);
  const main = items[at] ?? items[0];
  let photoNo = 0, videoNo = 0;
  return (
    <div className="gallery">
      <figure className="gallery-main">
        {main?.kind === 'image' && <img src={main.src} srcSet={main.set} sizes="(max-width:900px) 100vw, 62vw" width={1500} height={1000} decoding="async" fetchPriority="high" alt={name} />}
        {main?.kind === 'video' && (
          <video key={main.src} src={main.src} poster={main.poster ?? undefined} controls playsInline preload="metadata" autoPlay={at > 0}
            className="block h-full w-full bg-[#07070b] object-contain" aria-label={t.videoOf.replace('{name}', name)} />
        )}
        {sample && <span className="tag">{t.sample}</span>}
        {reserved && <span className="tag reserved">{t.reserved}</span>}
      </figure>
      {items.length > 1 && (
        <div className="thumbs">
          {items.map((p, n) => p.kind === 'image' ? (
            <button key={p.src + n} type="button" aria-label={t.photo + ' ' + ++photoNo} aria-pressed={n === at ? 'true' : 'false'} onClick={() => setAt(n)}>
              <img src={p.small} alt="" loading="lazy" decoding="async" />
            </button>
          ) : (
            <button key={p.src + n} type="button" className="relative" aria-label={t.video + ' ' + ++videoNo} aria-pressed={n === at ? 'true' : 'false'} onClick={() => setAt(n)}>
              {p.poster && <img src={p.poster} alt="" loading="lazy" decoding="async" />}
              <span aria-hidden="true" className="absolute inset-0 [display:grid] place-items-center text-[18px] text-champagne-hi [text-shadow:0_1px_8px_rgba(0,0,0,.8)]">▶</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
