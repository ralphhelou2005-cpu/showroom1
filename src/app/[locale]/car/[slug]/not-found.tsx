import Footer from '@/components/Footer';
import { Link } from '@/i18n/link';

/* a car address that isn't (or is no longer) in the showroom */
export default function CarNotFound() {
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div id="car" className="car-page">
          <h1 className="car-missing">We couldn’t find that car.</h1>
          <p className="car-line">It may have been sold. See what’s in the showroom now.</p>
          <Link className="btn" href="/inventory">Back to the inventory</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
