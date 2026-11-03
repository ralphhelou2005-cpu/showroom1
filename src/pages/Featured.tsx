import { metaFor, usePageMeta } from '../meta';
import { FeaturedPageSection } from '../components/FeaturedShowroom';
import Footer from '../components/Footer';

/* /featured: the dealership windows as their own page */
export default function Featured() {
  usePageMeta(metaFor('/featured'));
  return (
    <>
      <main id="main" tabIndex={-1}><FeaturedPageSection /></main>
      <Footer />
    </>
  );
}
