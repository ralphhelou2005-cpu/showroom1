/* Milcar's Supabase project.
   Both values are public on purpose: every visitor's browser needs them to read the cars, and the
   database rules in supabase/setup.sql decide what each visitor may see or change.
   Only ever put the publishable ("anon") key here: Supabase > Project Settings > API Keys.
   Never the service_role or secret key, anywhere in this project. */
export const SUPABASE_URL = 'https://nlhjnihjvlhimmigofbx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_MDD3MgQiVb62xVQ2ed-jUw_1X8KhVjP';

/* where the site lives, for links shared on WhatsApp and Instagram (they need full addresses) */
export const SITE_ORIGIN = 'https://ralphhelou2005-cpu.github.io';

/* a safety net: a secret key pasted here by mistake is refused, and the pages act as if Supabase were offline */
export const SUPABASE_KEY_OK = (() => {
  if (/^sb_secret_/.test(SUPABASE_ANON_KEY)) return false;
  try {
    const part = SUPABASE_ANON_KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).role !== 'service_role';
  } catch {
    return true;
  }
})();
if (!SUPABASE_KEY_OK) console.error('src/config.ts holds a secret key. Replace it with the publishable key, then reset the secret key in Supabase.');
