import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { asset } from '../data/images';

/* "Book a private viewing." The form isn't connected until the owner chooses where it sends.
   A car page links here with ?car=<name>, which fills in the car. */
export default function BookingForm() {
  const [params] = useSearchParams();
  const wanted = params.get('car');
  const [sent, setSent] = useState(false);
  const car = useRef<HTMLInputElement>(null);
  /* filled in after the page appears, as before (the built page has the field empty) */
  useEffect(() => { if (wanted && car.current) car.current.value = wanted; }, [wanted]);
  /* the page got shorter: the tail-light streak follows */
  useEffect(() => { if (sent) dispatchEvent(new Event('milcar:layout')); }, [sent]);
  const send = (e: FormEvent) => { e.preventDefault(); setSent(true); };
  return (
    <section className="book" id="book">
      <div className="book-img"><img src={asset('assets/hero-poster.webp')} srcSet={`${asset('assets/hero-poster-1100.webp')} 1100w, ${asset('assets/hero-poster.webp')} 1728w`} sizes="(max-width:900px) 100vw, 55vw" width={1728} height={972} alt="The Milcar showroom glowing at night" loading="lazy" decoding="async" /></div>
      <div className={'book-form' + (sent ? ' sent' : '')} id="bookForm">
        <h2>Book a private viewing.</h2>
        <p>Tell us how to reach you and which car you want to see.</p>
        <form id="form" onSubmit={send}>
          <label><span className="label">Name</span><input name="name" required autoComplete="name" placeholder="Your name" /></label>
          <label><span className="label">Phone</span><input name="phone" type="tel" required autoComplete="tel" placeholder="Your phone number" /></label>
          <label><span className="label">Car of interest</span><input name="car" ref={car} placeholder="The car you have in mind" /></label>
          <button className="btn" type="submit" id="bookEnd">Request my viewing</button>
        </form>
        <div className="done-msg" role="status"><h3>Thanks, this is a preview.</h3><p>This form isn't connected yet, so your details weren't sent anywhere.</p></div>
      </div>
    </section>
  );
}
