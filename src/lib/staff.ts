import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Database } from '@/types/database';
import { secretKey } from './env.server';
import type { Role } from './roles';
import { supabaseAdmin } from './supabase/admin';
import { supabaseServer } from './supabase/server';

/* Who is using the dashboard, and what they may do. The database rules decide what each person can read and
   change; these checks decide what the dashboard offers them and refuse an action before it is sent. */

export { ROLE_LABEL, ROLE_SUMMARY, ROLES, type Role } from './roles';

export type Profile = {
  id: string; email: string | null; full_name: string; phone: string | null; role: Role | null; active: boolean;
  preferred_locale: Database['public']['Enums']['locale'];
};

/* the signed-in person and their profile (once per request). The login is checked against the project's public
   signing key (ES256) on the spot, without a trip to Supabase Auth; the role and "switched on" come from the
   profile on every request, so switching someone off still takes effect at once. */
export const currentStaff = cache(async (): Promise<{ id: string; email: string; profile: Profile | null } | null> => {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  const id = auth?.claims?.sub;
  if (!id) return null;
  const { data } = await supabase.from('profiles').select('id, email, full_name, phone, role, active, preferred_locale').eq('id', id).maybeSingle();
  if (data && !data.active) return null;   // switched off: signed out at once (signing in again is blocked too)
  return { id, email: typeof auth.claims.email === 'string' ? auth.claims.email : '', profile: data };
});

/* for pages and actions: the person, with a role and switched on, or off to the login page */
export async function requireStaff(roles?: Role[]) {
  const me = await currentStaff();
  if (!me) redirect('/admin/login');
  const p = me.profile;
  if (!p?.role || !p.active) redirect('/admin');
  if (roles && !roles.includes(p.role)) throw new Error('not allowed');
  return { ...me, profile: p as Profile & { role: Role } };
}

export const displayName = (p: { full_name: string; email: string | null }) => p.full_name.trim() || p.email || 'Someone';

/* Only staff addresses are accepted after a link: never another site */
export function safeNext(next: unknown, fallback = '/admin') {
  return typeof next === 'string' && /^\/admin(\/[\w\-/]*)?(\?[\w=&%-]*)?$/.test(next) ? next : fallback;
}

/* ------------------------------------------------------------ rate limits */

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local';
}

/* At most `max` attempts per window for this key (stored hashed, so no email or address is kept).
   Without the server key, Supabase Auth's own limits on sign-ins and emails still apply. */
export async function withinLimit(key: string, windowSeconds: number, max: number) {
  if (!secretKey()) return true;
  const { data, error } = await supabaseAdmin().rpc('hit_rate_limit', { p_key: hash(key), p_window_seconds: windowSeconds, p_max: max });
  if (error) {
    console.error('rate limit check failed:', error.message);
    return true;
  }
  return data === true;
}
