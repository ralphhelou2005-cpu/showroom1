/* Milcar's Supabase project.
   Both values are public on purpose: every visitor's browser needs them to read the cars, and the
   database rules in supabase/setup.sql decide what each visitor may see or change.
   Only ever put the publishable ("anon") key here: Supabase > Project Settings > API Keys.
   Never the service_role or secret key, on any page.

   The public pages need only this file: they read the cars with one plain request (assets/inventory.js).
   The admin page loads the Supabase library first, then this file:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js" integrity="sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK" crossorigin="anonymous"></script>
   <script src="assets/supabase-config.js"></script> */
const SUPABASE_URL = 'https://nlhjnihjvlhimmigofbx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MDD3MgQiVb62xVQ2ed-jUw_1X8KhVjP';

/* a safety net: a secret key pasted here by mistake is refused, and the pages act as if Supabase were offline */
const SUPABASE_KEY_OK = (() => {
  if (/^sb_secret_/.test(SUPABASE_ANON_KEY)) return false;
  try { return JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'service_role'; }
  catch (e) { return true; }
})();
if (!SUPABASE_KEY_OK) console.error('supabase-config.js holds a secret key. Replace it with the publishable key, then reset the secret key in Supabase.');
