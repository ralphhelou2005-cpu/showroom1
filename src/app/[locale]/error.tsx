'use client';
import Offline from '@/components/Offline';

/* a page that couldn't be drawn (usually Supabase out of reach): the polite message; "Try again" reloads it */
export default function PageError() {
  return (
    <main id="main" tabIndex={-1}>
      <div className="car-page">
        <Offline />
      </div>
    </main>
  );
}
