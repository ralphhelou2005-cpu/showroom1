'use client';
import { useActionState, useEffect, useRef } from 'react';
import { requestViewing } from '@/app/[locale]/booking-action';
import type { Words } from '@/i18n/words';
import SlotPicker, { type Slot } from './SlotPicker';

/* "Book a private viewing." The request goes to the server (src/app/[locale]/booking-action.ts). A car page links
   here with ?car=<name>&slug=<address>, which fills in the car once the page is in the browser (the built page has
   the field empty). The calendar (./SlotPicker) shows only when the showroom has free times; without opening hours
   the team calls back to arrange one. `image` is the showroom picture beside the form. */
export default function BookingForm({ image, t, slots, today, whatsapp, locale, turnstile }: {
  image: { src: string; set: string }; t: Words['booking']; slots: Slot[]; today: string; whatsapp: string | null; locale: 'en' | 'fr' | 'ar'; turnstile: string | null;
}) {
  const [state, action, pending] = useActionState(requestViewing, null);
  const car = useRef<HTMLInputElement>(null), slug = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('car') && car.current) car.current.value = q.get('car')!;
    if (q.get('slug') && slug.current) slug.current.value = q.get('slug')!;
  }, []);
  useEffect(() => {
    if (!turnstile || document.getElementById('turnstile-js')) return;
    const s = document.createElement('script');
    s.id = 'turnstile-js'; s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, [turnstile]);
  const sent = !!state?.ok;
  /* the page got shorter: the tail-light streak follows */
  useEffect(() => { if (sent) dispatchEvent(new Event('milcar:layout')); }, [sent]);
  const v = state?.values;
  return (
    <section className="book" id="book">
      <div className="book-img"><img src={image.src} srcSet={image.set} sizes="(max-width:900px) 100vw, 55vw" width={1728} height={972} alt={t.imgAlt} loading="lazy" decoding="async" /></div>
      <div className={'book-form' + (sent ? ' sent' : '')} id="bookForm">
        <h2>{t.title}</h2>
        <p>{t.text}</p>
        <form id="form" action={action}>
          <label><span className="label">{t.name}</span><input name="name" defaultValue={v?.name} required autoComplete="name" placeholder={t.namePh} maxLength={120} /></label>
          <label><span className="label">{t.phone}</span><input name="phone" type="tel" defaultValue={v?.phone} required autoComplete="tel" placeholder={t.phonePh} /></label>
          <label><span className="label">{t.car}</span><input name="car" ref={car} defaultValue={v?.car} placeholder={t.carPh} maxLength={200} /></label>
          <SlotPicker slots={slots} today={today} locale={locale} t={t} initial={v?.starts_at} />
          <input type="hidden" name="slug" ref={slug} defaultValue={v?.slug} />
          <input type="hidden" name="locale" value={locale} />
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
          {turnstile && <div className="cf-turnstile" data-sitekey={turnstile} data-theme="dark" />}
          {state?.error && <p role="alert" className="book-error">{t.errors[state.error]}{whatsapp && (state.error === 'offline' || state.error === 'failed' || state.error === 'busy') ? <> <a href={whatsapp} rel="noopener" target="_blank">{t.whatsapp}</a></> : null}</p>}
          <button className="btn" type="submit" id="bookEnd" disabled={pending}>{pending ? t.sending : t.send}</button>
        </form>
        <div className="done-msg" role="status">
          <h3>{t.doneTitle}</h3>
          <p>{state?.at ? t.doneTime.replace('{time}', state.at) : t.doneCall}</p>
          {whatsapp && <p><a href={whatsapp} rel="noopener" target="_blank">{t.whatsapp}</a></p>}
        </div>
      </div>
    </section>
  );
}
