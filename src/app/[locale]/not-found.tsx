import { getWords } from '@/i18n/server-words';
import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import { Link } from '@/i18n/link';

export async function generateMetadata(): Promise<Metadata> {
  const { w } = await getWords();
  return { title: { absolute: w.meta.notFound }, robots: { index: false } };
}

/* any address the site doesn't have */
export default async function NotFound() {
  const { w: { missing: t } } = await getWords();
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div className="car-page">
          <h1 className="car-missing">{t.page}</h1>
          <p className="car-line">{t.pageLine}</p>
          <Link className="btn" href="/inventory">{t.pageBtn}</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
