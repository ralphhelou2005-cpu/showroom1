import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

/* Phase 2 only: proves the languages, the reading direction and the shared design values work.
   Phase 3 replaces it with the showroom's home page. */
export default async function FoundationPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('foundation');
  const lang = await getTranslations('language');
  return (
    <main id="main" className="mx-auto max-w-3xl px-[var(--gutter)] py-32">
      <p className="label">{t('label')}</p>
      <h1 className="mt-4 text-5xl text-ink">{t('title')}</h1>
      <p className="mt-6 max-w-[60ch] text-muted">{t('body')}</p>
      <nav aria-label={lang('label')} className="mt-12 flex gap-6">
        {routing.locales.map(l => (
          <Link key={l} href="/" locale={l} aria-current={l === locale ? 'page' : undefined}
            className="text-champagne-hi underline-offset-4 hover:underline aria-[current=page]:text-muted">
            {lang(l)}
          </Link>
        ))}
      </nav>
    </main>
  );
}
