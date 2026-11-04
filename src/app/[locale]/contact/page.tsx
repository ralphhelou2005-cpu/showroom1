import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Booking from '@/components/Booking';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/routing';
import { getBusiness, type Business } from '@/lib/catalog';
import { formatHours, whatsappLink } from '@/lib/labels';
import { pageMeta } from '@/lib/seo';

export const revalidate = 300;

const d = 'Reach Milcar Automotive Consultancy, or book a private viewing of the car you want to see.';
export const metadata: Metadata = pageMeta({ title: 'Contact | Milcar', description: d, path: '/contact' });

/* /contact: the showroom's details exactly as the owner entered them (nothing is shown in place of a missing one),
   then the booking form */
export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  let b: Business | null = null;
  try { b = await getBusiness(); } catch { /* the form below still works */ }
  const hours = b ? formatHours(b.hours) : [];
  const rows: [string, React.ReactNode][] = [];
  if (b?.address) rows.push(['Address', b.mapUrl ? <a href={b.mapUrl} rel="noopener" target="_blank">{b.address}</a> : b.address]);
  if (hours.length) rows.push(['Opening hours', hours.map(h => <span key={h} className="contact-line">{h}</span>)]);
  if (b?.phone) rows.push(['Phone', <a href={'tel:' + b.phone}>{b.phone}</a>]);
  if (b?.whatsapp) rows.push(['WhatsApp', <a href={whatsappLink(b.whatsapp, 'Hello Milcar,')} rel="noopener" target="_blank">{b.whatsapp}</a>]);
  if (b?.email) rows.push(['Email', <a href={'mailto:' + b.email}>{b.email}</a>]);
  if (b?.instagram) rows.push(['Instagram', <a href={'https://www.instagram.com/' + b.instagram.replace(/^@/, '')} rel="noopener" target="_blank">{b.instagram}</a>]);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">Contact</p>
          <h1>Come and see the car.</h1>
          <p>Tell us which car you want to see and we’ll arrange a private viewing.</p>
        </header>
        {rows.length > 0 && (
          <div className="contact-details">
            <section className="spec-block">
              <h2>The showroom</h2>
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
