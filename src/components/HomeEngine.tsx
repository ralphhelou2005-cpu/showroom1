'use client';
import { useEffect } from 'react';
import { startHome } from '@/lib/home';

declare global {
  interface Window { __milcarHome?: { stop: () => void; owner: 'page' | 'react' } }
}

/* The walk-in, captions, nav, streak and reveals on the home page's own markup, stopped on leaving.
   On a first visit the page's own script (public/engine/home.js) has usually started them already, before the rest
   of the site's code arrived: React adopts that run. After a page change inside the site, React starts it here. */
export default function HomeEngine() {
  useEffect(() => {
    let run = window.__milcarHome;
    if (!run) { run = { stop: startHome(document.getElementById('main')!), owner: 'react' }; window.__milcarHome = run; }
    return () => { run!.stop(); if (window.__milcarHome === run) window.__milcarHome = undefined; };
  }, []);
  return null;
}
