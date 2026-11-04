import { z } from 'zod';

/* Settings that are public on purpose: the browser needs them. Each environment (your computer, staging,
   production) sets its own in .env.local or in Vercel; .env.example lists them all.
   Next.js copies NEXT_PUBLIC_ values into the browser code, so a secret must never get that prefix. */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith('sb_publishable_', 'must be the publishable key (sb_publishable_…), never the secret key'),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

let parsed: z.infer<typeof schema> | undefined;

/* read when first needed, so a page that never talks to Supabase builds without these set */
export function publicEnv() {
  parsed ??= schema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return parsed;
}
