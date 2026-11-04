'use client';
import { useState } from 'react';
import type { Photo } from '@/lib/media';

/* a car's photos: the large one, and the thumbnails that choose it */
export default function Gallery({ photos, name, sample, reserved }: { photos: Photo[]; name: string; sample: boolean; reserved: boolean }) {
  const [at, setAt] = useState(0);
  const main = photos[at] ?? photos[0];
  return (
    <div className="gallery">
      <figure className="gallery-main">
        {main && <img src={main.src} srcSet={main.set} sizes="(max-width:900px) 100vw, 62vw" width={1500} height={1000} decoding="async" fetchPriority="high" alt={name} />}
        {sample && <span className="tag">Sample listing</span>}
        {reserved && <span className="tag reserved">Reserved</span>}
      </figure>
      {photos.length > 1 && (
        <div className="thumbs">
          {photos.map((p, n) => (
            <button key={p.src + n} type="button" aria-label={'Show photo ' + (n + 1)} aria-pressed={n === at ? 'true' : 'false'} onClick={() => setAt(n)}>
              <img src={p.small} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
