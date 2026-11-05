import 'server-only';

/* Secrets exist only on the server (the hosting's environment settings, or .env.local on your computer):
   'server-only' above makes the build fail if any browser code ever imports this file. Each feature reads its own
   keys where it is used and stays switched off, saying so in Settings > Connections, while they are missing. */

/* The server's Supabase key, or null while it isn't set. Without it the dashboard still works for everything
   staff do with their own login; invitations, the website's booking form and the rate limits say they are off. */
export function secretKey(): string | null {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return key && key.startsWith('sb_secret_') ? key : null;
}
