import { notFound } from 'next/navigation';

/* every other address under a language: the styled "page not found" page, with a real 404 status */
export default function CatchAll() {
  notFound();
}
