import { Link, useLocation } from 'react-router';
import { HomeLink } from './ui';

/* On the home page the nav starts clear over the walk-in and turns solid when the website rises (src/lib/home.ts);
   everywhere else it is solid. Phones keep only the last two links. */
export default function Nav() {
  const { pathname } = useLocation();
  const home = pathname === '/';
  const current = (match: boolean) => (match ? { 'aria-current': 'page' as const } : {});
  return (
    <nav className={home ? 'nav' : 'nav solid'} id="nav" aria-label="Main">
      <HomeLink id="top" home={home} className="wordmark">Milcar<small>Automotive Consultancy</small></HomeLink>
      <ul>
        <li><Link to="/featured" {...current(pathname === '/featured')}>Featured</Link></li>
        <li><HomeLink id="promise" home={home}>The promise</HomeLink></li>
        <li><HomeLink id="build" home={home}>The build</HomeLink></li>
        <li><HomeLink id="questions" home={home}>Questions</HomeLink></li>
        <li><Link to="/inventory" {...current(pathname === '/inventory' || pathname.startsWith('/car/'))}>Inventory</Link></li>
        <li><HomeLink id="book" home={home} className="btn">Book a viewing</HomeLink></li>
      </ul>
    </nav>
  );
}
