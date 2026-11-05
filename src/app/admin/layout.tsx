import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { fontVariables } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: { template: '%s | Milcar dashboard', default: 'Milcar dashboard' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0B0D14' };

/* the staff dashboard's own frame: the site's typefaces and colours, without the public nav or the walk-in */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables} data-scroll-behavior="smooth">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
