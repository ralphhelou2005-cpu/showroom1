import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { publicEnv } from '../env';
import { serverEnv } from '../env.server';

/* The server's own key, which passes every database rule. Used only for what visitors cannot do themselves
   and only after the server has checked the request: saving a website inquiry or booking (after the spam
   check and rate limit), recording analytics, sending invitations, and scheduled jobs.
   Never import this from a page that renders for staff: use supabaseServer() so their own rules apply. */
export function supabaseAdmin() {
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
