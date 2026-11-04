import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '../env';

/* For the dashboard in the browser: acts as the logged-in member of staff, so every database rule applies to them. */
export function supabaseBrowser() {
  const env = publicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
