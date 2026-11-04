import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { publicEnv } from '../env';

/* For public pages: reads what any visitor may read (published cars, brands, public settings), with no login
   and no cookies, so those pages can be built ahead of time and cached. */
export function supabasePublic() {
  const env = publicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
