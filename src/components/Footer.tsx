import { Link } from '@/i18n/link';
import { getBusiness, type Business } from '@/lib/catalog';
import { formatHours, whatsappLink } from '@/lib/labels';
import { HomeLink } from './ui';

/* The footer shows the showroom's details exactly as the owner entered them in the settings, and nothing in
   their place while they are empty: no placeholder address or phone number. */
export default async function Footer({ home = false }: { home?: boolean }) {
  let b: Business | null = null;
  try { b = await getBusiness(); } catch { /* the details are optional here: the rest of the page still shows */ }
  const hours = b ? formatHours(b.hours) : [];
  const reach = b && (b.phone || b.whatsapp || b.email || b.address || hours.length > 0);
  return (
    <footer>
      <div><HomeLink id="top" home={home} className="wordmark">Milcar</HomeLink><p className="signature">Minas Missirian</p><p>Automotive Consultancy</p></div>
      <div>
        <b>Explore</b>
        <ul className="footer-links">
          <li><Link href="/inventory">Inventory</Link></li>
          <li><Link href="/brands">Brands</Link></li>
          <li><Link href="/featured">Featured</Link></li>
          <li><Link href="/about">About</Link></li>
          <li><Link href="/contact">Contact</Link></li>
        </ul>
      </div>
      <div>
        <b>{reach ? 'Visit and call' : 'Private viewings'}</b>
        {reach && b ? (
          <ul className="footer-links">
            {b.address && <li>{b.mapUrl ? <a href={b.mapUrl} rel="noopener" target="_blank">{b.address}</a> : b.address}</li>}
            {hours.map(h => <li key={h}>{h}</li>)}
            {b.phone && <li><a href={'tel:' + b.phone}>{b.phone}</a></li>}
            {b.whatsapp && <li><a href={whatsappLink(b.whatsapp)} rel="noopener" target="_blank">WhatsApp</a></li>}
            {b.email && <li><a href={'mailto:' + b.email}>{b.email}</a></li>}
          </ul>
        ) : (
          <ul className="footer-links">
            <li><Link href="/private-viewing">Book a private viewing</Link></li>
          </ul>
        )}
      </div>
    </footer>
  );
}
