'use client';
import { useEffect } from 'react';
import { usePathname } from '@/i18n/link';

/* What every page shares around its content: the soft moving light and the film grain behind the inner pages
   (the home page has the walk-in instead), and animations pausing while the tab is hidden. */
export default function PageChrome() {
  const home = usePathname() === '/';
  useEffect(() => {
    const f = () => document.body.classList.toggle('paused', document.hidden);
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  return home ? null : <><div className="env" aria-hidden="true" /><div className="grain" aria-hidden="true" /></>;
}
