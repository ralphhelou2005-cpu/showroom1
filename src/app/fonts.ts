import localFont from 'next/font/local';

/* The site's three typefaces, from src/assets/fonts. Next.js fingerprints and preloads them (the script face only
   appears in the footer, so it is not preloaded) and exposes each as a CSS variable used by src/styles/site.css. */
export const marcellus = localFont({ src: '../assets/fonts/marcellus.woff2', variable: '--font-marcellus', display: 'swap' });
export const jost = localFont({ src: '../assets/fonts/jost.woff2', variable: '--font-jost', weight: '300 500', display: 'swap' });
export const script = localFont({ src: '../assets/fonts/mrs-saint-delafield.woff2', variable: '--font-script', display: 'swap', preload: false });

export const fontVariables = `${marcellus.variable} ${jost.variable} ${script.variable}`;
