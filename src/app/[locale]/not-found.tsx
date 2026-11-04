import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import { Link } from '@/i18n/link';

export const metadata: Metadata = { title: { absolute: 'Page not found | Milcar' }, robots: { index: false } };

/* any address the site doesn't have */
export default function NotFound() {
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div className="car-page">
          <h1 className="car-missing">This page isn’t here.</h1>
          <p className="car-line">It may have moved. The showroom is still open.</p>
          <Link className="btn" href="/inventory">See the inventory</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
