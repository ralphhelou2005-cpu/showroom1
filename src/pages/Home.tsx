import { useEffect, useRef } from 'react';
import { startHome } from '../lib/home';
import { metaFor, usePageMeta } from '../meta';
import Hero from '../components/Hero';
import FeaturedShowroom from '../components/FeaturedShowroom';
import PromiseSection from '../components/Promise';
import Build from '../components/Build';
import InventoryTeaser from '../components/InventoryTeaser';
import Process from '../components/Process';
import FAQ from '../components/FAQ';
import BookingForm from '../components/BookingForm';
import Footer from '../components/Footer';

/* the home page: the walk-in, then the website rising over it as one panel */
export default function Home() {
  usePageMeta(metaFor('/'));
  const root = useRef<HTMLElement>(null);
  useEffect(() => startHome(root.current!), []);
  return (
    <main id="main" tabIndex={-1} ref={root}>
      <Hero />
      <div className="below" id="below">
        <svg className="streak" id="streak" aria-hidden="true"><path id="streakPath" /></svg>
        <FeaturedShowroom />
        <PromiseSection />
        <Build />
        <InventoryTeaser />
        <Process />
        <FAQ />
        <BookingForm />
        <Footer home />
      </div>
    </main>
  );
}
