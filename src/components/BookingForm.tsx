'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';

/* "Book a private viewing." Sending arrives with the booking system (Phase 7): until then the form says plainly that
   nothing was sent. A car page links here with ?car=<name>, which fills in the car once the page is in the browser
   (as before: the built page has the field empty). `image` is the showroom picture beside the form. */
export default function BookingForm({ image }: { image: { src: string; set: string } }) {
  const [sent, setSent] = useState(false);
  const car = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('car');
    if (wanted && car.current) car.current.value = wanted;
  }, []);
  /* the page got shorter: the tail-light streak follows */
  useEffect(() => { if (sent) dispatchEvent(new Event('milcar:layout')); }, [sent]);
  const send = (e: FormEvent) => { e.preventDefault(); setSent(true); };
  return (
    <section className="book" id="book">
      <div className="book-img"><img src={image.src} srcSet={image.set} sizes="(max-width:900px) 100vw, 55vw" width={1728} height={972} alt="The Milcar showroom glowing at night" loading="lazy" decoding="async" /></div>
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
