import { asset } from '@/lib/media';
import { vars } from './ui';

export default function PromiseSection() {
  return (
    <section className="promise reveal" id="promise">
      <figure className="rv"><img src={asset('assets/promise.webp')} srcSet={`${asset('assets/promise-800.webp')} 800w, ${asset('assets/promise.webp')} 1000w`} sizes="(max-width:900px) 100vw, 50vw" width={1000} height={1500} decoding="async" loading="lazy" alt="The leather interior of a supercar" /></figure>
      <div>
        <p className="label rv" style={vars({ '--i': 1 })}>The promise</p>
        <h2 className="rv" style={vars({ '--i': 2 })}>Ask to see everything.</h2>
        <ul className="docs">
          <li className="rv" style={vars({ '--i': 3 })}>The VIN <span className="label">01</span></li>
          <li className="rv" style={vars({ '--i': 4 })}>The service records <span className="label">02</span></li>
          <li className="rv" style={vars({ '--i': 5 })}>The import papers <span className="label">03</span></li>
          <li className="rv" style={vars({ '--i': 6 })}>The mileage history <span className="label">04</span></li>
        </ul>
        <p className="ask rv" style={vars({ '--i': 7 })}>Ask for them before you ask the price.</p>
      </div>
    </section>
  );
}
