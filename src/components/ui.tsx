import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';

/* CSS custom properties on an element: vars({ '--i': 2 }) */
export const vars = (v: Record<string, string | number>) => v as CSSProperties;

/* the display face draws 1 and 0 like I and O, so digits in car names and prices use the body face */
export function Named({ text }: { text: string }) {
  return <>{text.split(/(\d+)/).map((part, n) => (part ? (n % 2 ? <span className="num" key={n}>{part}</span> : part) : null))}</>;
}

/* while the cars arrive */
export const Waiting = ({ text }: { text: string }) => <p className="label loading">{text}</p>;

/* Supabase can't be reached: say so politely, with a way forward */
export function Offline() {
  return (
    <div className="offline-note">
      <p className="label">The showroom</p>
      <h2>We can’t show the cars right now</h2>
      <p>Please try again in a moment, or book a private viewing and we’ll tell you what’s on the floor.</p>
      <div className="offline-actions">
        <button className="btn" type="button" onClick={() => location.reload()}>Try again</button>
        <Link className="btn ghost" to="/#book">Book a viewing</Link>
      </div>
    </div>
  );
}

/* a link to a part of the home page: a plain jump when already there, a page change otherwise */
export function HomeLink({ id, home, className, children }: { id: string; home: boolean; className?: string; children: ReactNode }) {
  return home ? <a className={className} href={'#' + id}>{children}</a> : <Link className={className} to={id === 'top' ? '/' : '/#' + id}>{children}</Link>;
}
