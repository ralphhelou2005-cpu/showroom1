import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '../env';

/* For dashboard pages and actions on the server: acts as the logged-in member of staff (from their login
   cookie), so every database rule applies to them exactly as in the browser. */
export async function supabaseServer() {
  const env = publicEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: list => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* a page cannot set cookies while it renders; the proxy (src/proxy.ts) keeps the login fresh instead */
        }
      },
    },
  });
}
