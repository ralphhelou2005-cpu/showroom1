import { getWords } from '@/i18n/server-words';
import { freeSlots } from '@/lib/booking';
import { getBusiness } from '@/lib/catalog';
import { whatsappLink } from '@/lib/labels';
import { asset } from '@/lib/media';
import BookingForm from './BookingForm';

/* The booking section as pages use it. The server gives the form its words, its picture, the free times of the
   next three weeks (none until opening hours are set in the dashboard: the time field then doesn't show) and the
   showroom's WhatsApp, if set. */
export default async function Booking() {
  const { w, locale } = await getWords();
  const [{ today, slots }, business] = await Promise.all([freeSlots(locale), getBusiness().catch(() => null)]);
  const wa = business?.whatsapp ? whatsappLink(business.whatsapp, w.contact.hello) : null;
  return (
    <BookingForm image={{ src: asset('assets/hero-poster.webp'), set: `${asset('assets/hero-poster-1100.webp')} 1100w, ${asset('assets/hero-poster.webp')} 1728w` }}
      t={w.booking} slots={slots} today={today} whatsapp={wa} locale={locale} turnstile={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null} />
  );
}
