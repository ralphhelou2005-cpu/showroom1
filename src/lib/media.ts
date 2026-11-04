import 'server-only';
import { ASSETS } from '@/data/asset-manifest';
import { publicEnv } from './env';

/* A picture as the browser needs it: the full size, the 800 px copy beside it, and both as a srcset.
   Built on the server and passed to pages as plain strings. */
export interface Photo { src: string; small: string; set: string }

const small = (path: string) => path.replace(/\.(webp|jpe?g|png|avif)$/i, '-800.$1');

/* a picture that ships with the site ("assets/cars/svj.webp"), by its fingerprinted address */
export const asset = (path: string): string => ASSETS[path] ?? path;

export function sitePhoto(path: string, big = 1500): Photo {
  const src = asset(path), sm = asset(small(path));
  return { src, small: sm, set: `${sm} 800w, ${src} ${big}w` };
}

/* a file uploaded in the dashboard, served from the public storage bucket */
export function storageUrl(bucket: string, path: string): string {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/* a vehicle's photo, wherever it lives: uploads also get an 800 px copy when they are saved */
export function mediaPhoto(bucket: string | null, path: string): Photo {
  if (!bucket) return sitePhoto(path);
  const src = storageUrl(bucket, path), sm = storageUrl(bucket, small(path));
  return { src, small: sm, set: `${sm} 800w, ${src} 1500w` };
}
