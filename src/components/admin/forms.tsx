'use client';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

/* The dashboard's form pieces, in the site's own look (its fields, labels and metal buttons from site.css). */

import type { FormState } from '@/lib/form-state';
export type { FormState };

/* the button that sends the form, and says so while it waits. It ignores clicks while waiting instead of being
   disabled, so it keeps the keyboard focus. */
export function Submit({ children, busy, className = 'btn', ...rest }: { children: ReactNode; busy?: string; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" aria-disabled={pending} onClick={e => { if (pending) e.preventDefault(); }} {...rest}>
      {pending ? busy ?? 'One moment…' : children}
    </button>
  );
}

/* the answer to a form: an error is announced at once, a confirmation politely */
export function Message({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="mt-4 rounded-2xl px-5 py-3 text-[15px] text-ink shadow-[inset_0_0_0_1px_rgba(200,32,42,.55)] bg-[rgba(200,32,42,.12)]">{state.error}</p>;
  if (state?.done) return <p role="status" className="mt-4 rounded-2xl px-5 py-3 text-[15px] text-champagne-hi shadow-[inset_0_0_0_1px_var(--line-strong)]">{state.done}</p>;
  return null;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

/* a dropdown drawn like the site's fields */
export const selectClass =
  'block w-full min-h-12 appearance-none border-0 border-b border-line-strong bg-transparent pe-8 text-[17px] font-light text-ink focus:border-champagne-hi focus:outline-none ' +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23D9C6A3'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_4px_center]";

/* a small button for actions inside lists (the site's .btn is sized for whole forms; Tailwind's layer wins over it) */
export const smallBtn = 'btn ghost w-auto min-h-10 mt-0 px-5 text-[11px] tracking-[.18em] after:hidden';
