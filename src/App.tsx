import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router';
import Nav from './components/Nav';
import Home from './screens/Home';

/* the home page loads with the site; the other pages load when first opened */
const Inventory = lazy(() => import('./screens/Inventory'));
const CarPage = lazy(() => import('./screens/Car'));
const Featured = lazy(() => import('./screens/Featured'));
const NotFound = lazy(() => import('./screens/NotFound'));

/* old addresses people may have shared keep working: car.html?id=f8-tributo becomes /car/f8-tributo */
function OldLink({ to }: { to: 'home' | 'inventory' | 'featured' | 'car' }) {
  const { search, hash } = useLocation();
  if (to === 'car') {
    const id = new URLSearchParams(search).get('id');
    return <Navigate replace to={id ? '/car/' + encodeURIComponent(id) + hash : '/inventory'} />;
  }
  return <Navigate replace to={{ pathname: to === 'home' ? '/' : '/' + to, search, hash }} />;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/* a new page starts at its top, or at the part its link names (/#book); Back returns to where the visitor was */
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const type = useNavigationType();
  const first = useRef(true), prevPath = useRef(pathname);
  useIsoLayoutEffect(() => {
    let tries = 0, id = 0;
    /* jumps are instant: a smooth glide down the home page would play the whole walk-in */
    const jump = (top: number) => scrollTo({ top, behavior: 'instant' });
    const go = () => {
      if (type === 'POP' && saved) {
        if (document.documentElement.scrollHeight >= saved + innerHeight || tries > 40) { jump(saved); return; }
      } else if (hash) {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) { el.scrollIntoView({ behavior: 'instant' }); return; }
        if (tries > 40) return;
      } else { jump(0); return; }
      tries++; id = requestAnimationFrame(go);
    };
    const saved = Number(sessionStorage.getItem('milcar-scroll:' + key) || 0);
    const samePage = prevPath.current === pathname;
    prevPath.current = pathname;
    /* the first page of a visit is placed by the browser, as before (a reload stays put, #book jumps there),
       and so is a jump within the same page (the home page's own links glide there smoothly) */
    if (first.current) first.current = false;
    else if (!(samePage && type === 'POP')) { history.scrollRestoration = 'manual'; go(); }
    /* the place is noted the moment the visitor leaves (a link, or Back), before the next page appears.
       Nothing runs while scrolling: reading the scroll position there would slow the walk-in on phones. */
    let last = scrollY;
    const note = () => { last = scrollY; };
    const remember = () => { try { sessionStorage.setItem('milcar-scroll:' + key, String(Math.round(last))); } catch { /* private mode */ } };
    document.addEventListener('click', note, true);
    addEventListener('popstate', note, true);
    return () => { cancelAnimationFrame(id); remember(); document.removeEventListener('click', note, true); removeEventListener('popstate', note, true); };
  }, [pathname, key]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  /* animations pause while the tab is hidden */
  useEffect(() => {
    const f = () => document.body.classList.toggle('paused', document.hidden);
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  return (
    <>
      <ScrollManager />
      <a className="skip" href="#main">Skip to content</a>
      {pathname !== '/' && <><div className="env" aria-hidden="true" /><div className="grain" aria-hidden="true" /></>}
      <Nav />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/car/:id" element={<CarPage />} />
          <Route path="/featured" element={<Featured />} />
          <Route path="/index.html" element={<OldLink to="home" />} />
          <Route path="/inventory.html" element={<OldLink to="inventory" />} />
          <Route path="/featured.html" element={<OldLink to="featured" />} />
          <Route path="/car.html" element={<OldLink to="car" />} />
          <Route path="/car" element={<Navigate replace to="/inventory" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
