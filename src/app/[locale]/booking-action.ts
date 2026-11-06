'use server';
import { typed } from '@/lib/form-state';
import { submitBooking, type BookingError } from '@/lib/booking';

/* "Request my viewing" on this website's form: the checks and the saving are in src/lib/booking.ts, shared with
   the current site's form (src/app/api/booking). */

export type BookingState = {
  ok?: boolean; error?: BookingError; at?: string | null;
  values?: Record<string, string>;   // what the visitor typed, handed back with an error (React empties the form)
} | null;

export async function requestViewing(_: BookingState, form: FormData): Promise<BookingState> {
  const r = await submitBooking(Object.fromEntries(form), form.get('cf-turnstile-response') as string | null);
  return 'error' in r ? { error: r.error, values: typed(form, 'name', 'phone', 'car', 'slug', 'starts_at', 'at_label') } : r;
}
