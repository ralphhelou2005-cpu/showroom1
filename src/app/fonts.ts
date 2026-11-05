import localFont from 'next/font/local';

/* The site's three typefaces, from src/assets/fonts. Next.js fingerprints and preloads them (the script face only
   appears in the footer, so it is not preloaded) and exposes each as a CSS variable used by src/styles/site.css. */
export const marcellus = localFont({ src: '../assets/fonts/marcellus.woff2', variable: '--font-marcellus', display: 'swap' });
export const jost = localFont({ src: '../assets/fonts/jost.woff2', variable: '--font-jost', weight: '300 500', display: 'swap' });
export const script = localFont({ src: '../assets/fonts/mrs-saint-delafield.woff2', variable: '--font-script', display: 'swap', preload: false });

/* Arabic: Amiri for titles, IBM Plex Sans Arabic for text (both open source, from @fontsource). Arabic letters only
   (unicode-range), so pages without Arabic never download them. Used by src/styles/rtl.css. */
export const amiri = localFont({
  src: [
    { path: '../../node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2', weight: '400' },
    { path: '../../node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-amiri', display: 'swap', preload: false, adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F' }],
});
export const plexArabic = localFont({
  src: [
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-300-normal.woff2', weight: '300' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500' },
  ],
  variable: '--font-plex-arabic', display: 'swap', preload: false, adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F' }],
});

export const fontVariables = `${marcellus.variable} ${jost.variable} ${script.variable} ${amiri.variable} ${plexArabic.variable}`;
