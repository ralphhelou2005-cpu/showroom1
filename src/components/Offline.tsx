'use client';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/link';

/* the words here, since this shows when a page couldn't be drawn on the server */
const T = {
  en: { label: 'The showroom', title: 'We can’t show the cars right now', text: 'Please try again in a moment, or book a private viewing and we’ll tell you what’s on the floor.', retry: 'Try again', book: 'Book a viewing' },
  fr: { label: 'Le showroom', title: 'Nous ne pouvons pas afficher les voitures pour le moment', text: 'Merci de réessayer dans un instant, ou réservez une visite privée et nous vous dirons ce qui est exposé.', retry: 'Réessayer', book: 'Réserver une visite' },
  ar: { label: 'المعرض', title: 'لا يمكننا عرض السيارات الآن', text: 'يرجى المحاولة بعد لحظات، أو احجز معاينة خاصة وسنخبرك بما هو معروض.', retry: 'حاول مجدداً', book: 'احجز معاينة' },
};

/* Supabase can't be reached: say so politely, with a way forward */
export default function Offline({ onRetry }: { onRetry?: () => void }) {
  const locale = useParams<{ locale?: string }>()?.locale;
  const t = T[(locale === 'fr' || locale === 'ar' ? locale : 'en') as keyof typeof T];
  return (
    <div className="offline-note">
      <p className="label">{t.label}</p>
      <h2>{t.title}</h2>
      <p>{t.text}</p>
      <div className="offline-actions">
        <button className="btn" type="button" onClick={() => (onRetry ? onRetry() : location.reload())}>{t.retry}</button>
        <Link className="btn ghost" href="/private-viewing">{t.book}</Link>
      </div>
    </div>
  );
}
