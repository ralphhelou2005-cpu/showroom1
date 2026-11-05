import { getWords } from '@/i18n/server-words';
import Footer from '@/components/Footer';
import { Link } from '@/i18n/link';

/* a car address that isn't (or is no longer) in the showroom */
export default async function CarNotFound() {
  const { w: { missing: t } } = await getWords();
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div id="car" className="car-page">
          <h1 className="car-missing">{t.car}</h1>
          <p className="car-line">{t.carLine}</p>
          <Link className="btn" href="/inventory">{t.carBtn}</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
