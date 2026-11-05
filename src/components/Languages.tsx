'use client';
import { usePathname } from 'next/navigation';

const NAMES = [['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']] as const;

/* the same page in the other languages (English keeps the plain address) */
export default function Languages({ label }: { label: string }) {
  const path = usePathname() || '/';
  const current = path.match(/^\/(fr|ar)(?=\/|$)/)?.[1] ?? 'en';
  const bare = path.replace(/^\/(fr|ar)(?=\/|$)/, '') || '/';
  return (
    <ul className="footer-links footer-languages" aria-label={label}>
      {NAMES.map(([l, name]) => (
        <li key={l}>
          {l === current
            ? <span aria-current="true" lang={l}>{name}</span>
            : <a href={l === 'en' ? bare : `/${l}${bare === '/' ? '' : bare}`} hrefLang={l} lang={l}>{name}</a>}
        </li>
      ))}
    </ul>
  );
}
