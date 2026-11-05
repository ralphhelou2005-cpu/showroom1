import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { publicEnv } from '../env';
import { secretKey } from '../env.server';

/* The server's own key, which passes every database rule. Used only for what visitors cannot do themselves
   and only after the server has checked the request: saving a website inquiry or booking (after the spam
   check and rate limit), recording analytics, creating a login for an invitation, and scheduled jobs.
   Never import this from a page that renders for staff: use supabaseServer() so their own rules apply.
   Callers check secretKey() first and say plainly that the feature is off while it is missing. */
export function supabaseAdmin() {
  const key = secretKey();
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
