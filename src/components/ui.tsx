import type { CSSProperties, ReactNode } from 'react';
import { Link } from '@/i18n/link';

/* CSS custom properties on an element: vars({ '--i': 2 }) */
export const vars = (v: Record<string, string | number>) => v as CSSProperties;

/* the display face draws 1 and 0 like I and O, so digits in car names and prices use the body face */
export function Named({ text }: { text: string }) {
  return <>{text.split(/(\d+)/).map((part, n) => (part ? (n % 2 ? <span className="num" key={n}>{part}</span> : part) : null))}</>;
}

/* a link to a part of the home page: a plain jump when already there, a page change otherwise */
export function HomeLink({ id, home, className, children }: { id: string; home: boolean; className?: string; children: ReactNode }) {
  return home ? <a className={className} href={'#' + id}>{children}</a> : <Link className={className} href={id === 'top' ? '/' : '/#' + id}>{children}</Link>;
}
