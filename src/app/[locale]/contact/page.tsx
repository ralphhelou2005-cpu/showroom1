import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Booking from '@/components/Booking';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/routing';
import { getBusiness, type Business } from '@/lib/catalog';
import { formatHours, formatPhone, whatsappLink } from '@/lib/labels';
import { pageMeta } from '@/lib/seo';
import { WORDS } from '@/i18n/words';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.contact;
  return pageMeta({ title: m.title, description: m.description, path: '/contact', locale });
}

/* /contact: the showroom's details exactly as the owner entered them (nothing is shown in place of a missing one),
   then the booking form */
export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const w = WORDS[locale], t = w.contact;
  let b: Business | null = null;
  try { b = await getBusiness(); } catch { /* the form below still works */ }
  const hours = b ? formatHours(b.hours, w.common.days) : [];
  const rows: [string, React.ReactNode][] = [];
  if (b?.address) rows.push([t.address, b.mapUrl ? <a href={b.mapUrl} rel="noopener" target="_blank">{b.address}</a> : b.address]);
  if (hours.length) rows.push([t.hours, hours.map(h => <span key={h} className="contact-line">{h}</span>)]);
  if (b?.phone) rows.push([t.phone, <a href={'tel:' + b.phone} dir="ltr">{formatPhone(b.phone)}</a>]);
  if (b?.whatsapp) rows.push([t.whatsapp, <a href={whatsappLink(b.whatsapp, t.hello)} rel="noopener" target="_blank" dir="ltr">{formatPhone(b.whatsapp)}</a>]);
  if (b?.email) rows.push([t.email, <a href={'mailto:' + b.email}>{b.email}</a>]);
  if (b?.instagram) rows.push([t.instagram, <a href={'https://www.instagram.com/' + b.instagram.replace(/^@/, '')} rel="noopener" target="_blank">{b.instagram}</a>]);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">{t.label}</p>
          <h1>{t.title}</h1>
          <p>{t.text}</p>
        </header>
        {rows.length > 0 && (
          <div className="contact-details">
            <section className="spec-block">
              <h2>{t.showroom}</h2>
              <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </section>
          </div>
        )}
        <Booking />
      </main>
      <Footer />
    </>
  );
}
