import { Link } from '@/i18n/link';
import { getWords } from '@/i18n/server-words';
import { getBusiness, type Business } from '@/lib/catalog';
import { formatHours, formatPhone, whatsappLink } from '@/lib/labels';
import Languages from './Languages';
import { HomeLink } from './ui';

/* The footer shows the showroom's details exactly as the owner entered them in the settings, and nothing in
   their place while they are empty: no placeholder address or phone number. */
export default async function Footer({ home = false }: { home?: boolean }) {
  const { w } = await getWords();
  const t = w.footer;
  let b: Business | null = null;
  try { b = await getBusiness(); } catch { /* the details are optional here: the rest of the page still shows */ }
  const hours = b ? formatHours(b.hours, w.common.days) : [];
  const reach = b && (b.phone || b.whatsapp || b.email || b.address || hours.length > 0);
  return (
    <footer>
      <div><HomeLink id="top" home={home} className="wordmark">Milcar</HomeLink><p className="signature">Minas Missirian</p><p>{t.tagline}</p></div>
      <div>
        <b>{t.explore}</b>
        <ul className="footer-links">
          <li><Link href="/inventory">{t.inventory}</Link></li>
          <li><Link href="/brands">{t.brands}</Link></li>
          <li><Link href="/featured">{t.featured}</Link></li>
          <li><Link href="/about">{t.about}</Link></li>
          <li><Link href="/contact">{t.contact}</Link></li>
        </ul>
        <Languages label={w.nav.languages} />
      </div>
      <div>
        <b>{reach ? t.visit : t.viewings}</b>
        {reach && b ? (
          <ul className="footer-links">
            {b.address && <li>{b.mapUrl ? <a href={b.mapUrl} rel="noopener" target="_blank">{b.address}</a> : b.address}</li>}
            {hours.map(h => <li key={h}>{h}</li>)}
            {b.phone && <li><a href={'tel:' + b.phone} dir="ltr">{formatPhone(b.phone)}</a></li>}
            {b.whatsapp && <li><a href={whatsappLink(b.whatsapp)} rel="noopener" target="_blank">WhatsApp</a></li>}
            {b.email && <li><a href={'mailto:' + b.email}>{b.email}</a></li>}
          </ul>
        ) : (
          <ul className="footer-links">
            <li><Link href="/private-viewing">{t.book}</Link></li>
          </ul>
        )}
      </div>
    </footer>
  );
}
