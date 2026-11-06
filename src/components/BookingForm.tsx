import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { asset } from '../data/images';
import SlotPicker, { type Slot } from './SlotPicker';

/* "Book a private viewing." Sent to the new platform's booking service, which checks it (a hidden trap field and
   limits per address and per phone) and saves it in the dashboard as a lead and, with a time, a viewing to approve.
   The calendar's free times come from there too: the opening hours and booking rules in the dashboard's Settings.
   A car page links here with ?car=<name>&slug=<its address>, which fills in the car. */
const SERVICE = import.meta.env.VITE_BOOKING_URL || 'https://milcar-platform.vercel.app/api/booking';

const T = {
  time: 'Preferred time', timeAny: 'Any time: call me to arrange it', pickDay: 'Choose a day', pickTime: 'Choose a time',
  send: 'Request my viewing', sending: 'Sending…', doneTitle: 'Thank you.', doneCall: 'We’ll call you shortly to arrange your viewing.',
  doneTime: 'We’ve noted {time}. We’ll call you to confirm it.', whatsapp: 'Prefer WhatsApp? Message us.',
};
const ERRORS = {
  name: 'Please write your name.', phone: 'Please write your phone number with its country code, like +961 3 123 456.',
  taken: 'That time was just taken. Please choose another.', closed: 'That time is no longer available. Please choose another.',
  busy: 'Too many requests. Please wait a little, or call us.', offline: 'Our booking line isn’t connected yet. Please call or message us.',
  failed: 'Your request couldn’t be sent just now. Please try again, or call us.',
};
type Problem = keyof typeof ERRORS;

export default function BookingForm() {
  const [params] = useSearchParams();
  const wanted = params.get('car'), wantedSlug = params.get('slug');
  const [free, setFree] = useState<{ today: string; slots: Slot[]; whatsapp: string | null } | null>(null);
  const [state, setState] = useState<{ sent?: boolean; at?: string | null; error?: Problem; pending?: boolean }>({});
  const car = useRef<HTMLInputElement>(null), slug = useRef<HTMLInputElement>(null);
  /* filled in after the page appears, as before (the built page has the field empty) */
  useEffect(() => {
    if (wanted && car.current) car.current.value = wanted;
    if (slug.current) slug.current.value = wantedSlug && /^[a-z0-9-]{1,100}$/.test(wantedSlug) ? wantedSlug : '';
  }, [wanted, wantedSlug]);
  /* the free times, once the page is in: without them the form still sends, and the team calls back */
  useEffect(() => {
    let live = true;
    fetch(SERVICE).then(r => (r.ok ? r.json() : null)).then(d => { if (live && d && Array.isArray(d.slots)) setFree(d); }).catch(() => {});
    return () => { live = false; };
  }, []);
  /* the page changed height (the calendar, then the thank-you): the tail-light streak follows */
  useEffect(() => { if (free || state.sent) dispatchEvent(new Event('milcar:layout')); }, [free, state.sent]);

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.pending) return;
    const body = { ...Object.fromEntries(new FormData(e.currentTarget)), locale: 'en' };
    setState({ pending: true });
    try {
      const r = await fetch(SERVICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({ error: 'failed' }));
      setState(d.ok ? { sent: true, at: d.at ?? null } : { error: (d.error in ERRORS ? d.error : 'failed') as Problem });
    } catch { setState({ error: 'failed' }); }
  };
  const wa = free?.whatsapp ?? null;
  return (
    <section className="book" id="book">
      <div className="book-img"><img src={asset('assets/hero-poster.webp')} srcSet={`${asset('assets/hero-poster-1100.webp')} 1100w, ${asset('assets/hero-poster.webp')} 1728w`} sizes="(max-width:900px) 100vw, 55vw" width={1728} height={972} alt="The Milcar showroom glowing at night" loading="lazy" decoding="async" /></div>
      <div className={'book-form' + (state.sent ? ' sent' : '')} id="bookForm">
        <h2>Book a private viewing.</h2>
        <p>Tell us how to reach you and which car you want to see.</p>
        <form id="form" onSubmit={send}>
          <label><span className="label">Name</span><input name="name" required autoComplete="name" placeholder="Your name" maxLength={120} /></label>
          <label><span className="label">Phone</span><input name="phone" type="tel" required autoComplete="tel" placeholder="Your phone number" /></label>
          <label><span className="label">Car of interest</span><input name="car" ref={car} placeholder="The car you have in mind" maxLength={200} /></label>
          {free && <SlotPicker slots={free.slots} today={free.today} locale="en" t={T} />}
          <input type="hidden" name="slug" ref={slug} />
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
          {state.error && <p role="alert" className="book-error">{ERRORS[state.error]}{wa && ['offline', 'failed', 'busy'].includes(state.error) ? <> <a href={wa} rel="noopener" target="_blank">{T.whatsapp}</a></> : null}</p>}
          <button className="btn" type="submit" id="bookEnd" disabled={state.pending}>{state.pending ? T.sending : T.send}</button>
        </form>
        <div className="done-msg" role="status">
          <h3>{T.doneTitle}</h3>
          <p>{state.at ? T.doneTime.replace('{time}', state.at) : T.doneCall}</p>
          {wa && <p><a href={wa} rel="noopener" target="_blank">{T.whatsapp}</a></p>}
        </div>
      </div>
    </section>
  );
}
