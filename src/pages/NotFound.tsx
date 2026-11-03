import { Link } from 'react-router';
import { metaFor, usePageMeta } from '../meta';
import Footer from '../components/Footer';

export default function NotFound() {
  usePageMeta(metaFor('/missing'));
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div className="car-page">
          <h1 className="car-missing">This page isn’t here.</h1>
          <p className="car-line">It may have moved. The showroom is still open.</p>
          <Link className="btn" to="/inventory">See the inventory</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
