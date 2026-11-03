import { useState } from 'react';
import { useCars } from '../data/cars';
import { metaFor, usePageMeta } from '../meta';
import CarCard from '../components/CarCard';
import Footer from '../components/Footer';
import { Offline, Waiting } from '../components/ui';

/* /inventory: every car that isn't sold, with filters by type */
export default function Inventory() {
  usePageMeta(metaFor('/inventory'));
  const { cars, failed } = useCars();
  const [type, setType] = useState('All');
  const types = cars ? ['All', ...new Set(cars.map(c => c.type))] : [];
  const current = types.includes(type) ? type : 'All';
  const shown = cars ? cars.filter(c => current === 'All' || c.type === current) : [];
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">The showroom</p>
          <h1>Inventory</h1>
          <p>Pick a car to see its full specs, then ask for its history.</p>
          {/* the note disappears by itself once no car is marked as a sample */}
          <p className="sample-note" hidden={(cars !== null && !cars.some(c => c.sample)) || (failed && !cars)}>Preview: these are sample listings with stock photos. Your real cars and prices go here.</p>
        </header>
        <div className="filters" id="filters" role="group" aria-label="Filter by type">
          {cars && cars.length > 0 && types.map(t => (
            <button key={t} type="button" data-type={t} aria-pressed={t === current ? 'true' : 'false'} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
        {/* a new filter draws the cards afresh, so they rise in again as before */}
        <div className="grid" id="grid" key={current}>
          {cars ? (cars.length ? shown.map((c, i) => <CarCard key={c.id} car={c} i={i} lead={current === 'All' && i === 0} />)
            : <p className="inv-empty">New cars are on their way. Book a viewing and we’ll tell you first.</p>)
            : failed ? <Offline /> : <Waiting text="Opening the showroom…" />}
        </div>
      </main>
      <Footer />
    </>
  );
}
