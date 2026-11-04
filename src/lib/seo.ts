import type { Metadata } from 'next';
import { asset } from './media';

/* Each page's title, description and sharing picture (WhatsApp and Instagram read them from the page as built).
   Addresses are made absolute from NEXT_PUBLIC_SITE_URL (metadataBase in the layout). */
export const HOME_TITLE = 'Milcar | Supercars with the whole story';

export function pageMeta({ title, description, shareText = description, image = 'assets/hero-poster.jpg', path }: {
  title: string; description: string; shareText?: string; image?: string; path: string;
}): Metadata {
  const img = image.startsWith('http') || image.startsWith('/') ? image : asset(image);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: 'Milcar', title, description: shareText, url: path, images: [img] },
    twitter: { card: 'summary_large_image', title, description: shareText, images: [img] },
  };
}
