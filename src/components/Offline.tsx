'use client';
import { Link } from '@/i18n/link';

/* Supabase can't be reached: say so politely, with a way forward */
export default function Offline({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="offline-note">
      <p className="label">The showroom</p>
      <h2>We can’t show the cars right now</h2>
      <p>Please try again in a moment, or book a private viewing and we’ll tell you what’s on the floor.</p>
      <div className="offline-actions">
        <button className="btn" type="button" onClick={() => (onRetry ? onRetry() : location.reload())}>Try again</button>
        <Link className="btn ghost" href="/private-viewing">Book a viewing</Link>
      </div>
    </div>
  );
}
