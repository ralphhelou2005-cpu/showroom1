import { getWords } from '@/i18n/server-words';
import { getBusiness } from '@/lib/catalog';
import { whatsappLink } from '@/lib/labels';
import { asset } from '@/lib/media';
import { supabasePublic } from '@/lib/supabase/public';
import BookingForm, { type Slot } from './BookingForm';

/* The booking section as pages use it. The server gives the form its words, its picture, the free times of the
   next three weeks (none until opening hours are set in the dashboard: the time field then doesn't show) and the
   showroom's WhatsApp, if set. */
export default async function Booking() {
  const { w, locale } = await getWords();
  const today = new Date();
  const until = new Date(today.getTime() + 21 * 86400_000);
  const [slotsRes, business] = await Promise.all([
    supabasePublic().rpc('available_slots', { p_from: today.toISOString().slice(0, 10), p_to: until.toISOString().slice(0, 10) }).then(r => r, () => ({ data: null })),
    getBusiness().catch(() => null),
  ]);
  const tag = locale === 'ar' ? 'ar-LB-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-GB';
  const fmt = new Intl.DateTimeFormat(tag, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Beirut' });
  const hour = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Beirut' });
  const slots: Slot[] = (slotsRes.data ?? []).slice(0, 200).map(s => ({ value: s.slot_start, day: fmt.format(new Date(s.slot_start)), time: hour.format(new Date(s.slot_start)) }));
  const wa = business?.whatsapp ? whatsappLink(business.whatsapp, w.contact.hello) : null;
  return (
    <BookingForm image={{ src: asset('assets/hero-poster.webp'), set: `${asset('assets/hero-poster-1100.webp')} 1100w, ${asset('assets/hero-poster.webp')} 1728w` }}
      t={w.booking} slots={slots} whatsapp={wa} locale={locale} turnstile={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null} />
  );
}
