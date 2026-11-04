'use client';
import { useEffect } from 'react';

/* The home page's reveals (src/lib/home.ts) for the inner pages that reuse its sections: each .reveal fades in
   once a seventh of it is on screen, with the same timing; with reduced motion everything is simply shown. */
export default function Reveals() {
  useEffect(() => {
    const all = [...document.querySelectorAll<HTMLElement>('main .reveal')];
    const show = () => all.forEach(el => el.classList.add('in', 'done'));
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    if (rm.matches) { show(); return; }
    const timers: number[] = [];
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      timers.push(window.setTimeout(() => e.target.classList.add('done'), 1800));
    }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    all.forEach(el => io.observe(el));
    const onMotion = (e: MediaQueryListEvent) => { if (e.matches) show(); };
    rm.addEventListener('change', onMotion);
    return () => { io.disconnect(); timers.forEach(clearTimeout); rm.removeEventListener('change', onMotion); };
  }, []);
  return null;
}
