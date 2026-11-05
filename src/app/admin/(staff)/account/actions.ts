'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { typed, type FormState } from '@/lib/form-state';
import { publicEnv } from '@/lib/env';
import { requireStaff, withinLimit } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';

/* People's own details and password. The database lets everyone edit their own name, phone and language,
   and nothing else about themselves. */

export async function saveDetails(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  const values = typed(form, 'full_name', 'phone', 'preferred_locale');
  const input = z.object({
    full_name: z.string().trim().min(1, 'Write your name.').max(120),
    phone: z.union([z.literal(''), z.string().trim().transform(s => s.replace(/[\s().-]/g, '')).pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, 'Write your phone number in international form, like +961 3 123 456.'))]),
    preferred_locale: z.enum(['en', 'fr', 'ar']),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message, values };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('profiles').update({ ...input.data, phone: input.data.phone || null }).eq('id', me.id);
  if (error) {
    console.error('profile save failed:', error.message);
    return { error: 'Your details couldn’t be saved just now. Try again in a moment.', values };
  }
  revalidatePath('/admin', 'layout');
  return { done: 'Saved.' };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff();
  const input = z.object({
    current: z.string().min(1, 'Write your current password.').max(200),
    password: z.string().min(10, 'Your new password needs at least 10 characters.').max(72, 'Your new password can have at most 72 characters.'),
    repeat: z.string(),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message };
  if (input.data.password !== input.data.repeat) return { error: 'The two new passwords are different.' };
  if (!(await withinLimit('password:' + me.id, 900, 5))) return { error: 'Too many attempts. Wait fifteen minutes, then try again.' };

  /* the current password is checked on a separate connection, so a wrong one leaves the signed-in session alone */
  const env = publicEnv();
  const check = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await check.auth.signInWithPassword({ email: me.email, password: input.data.current });
  if (wrong) return { error: wrong.code === 'invalid_credentials' ? 'Your current password isn’t right.' : 'Your password couldn’t be checked just now. Try again in a moment.' };
  await check.auth.signOut({ scope: 'local' });

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: input.data.password });
  if (error) {
    if (error.code === 'same_password') return { error: 'Choose a password different from your current one.' };
    if (error.code === 'weak_password') return { error: 'That password is too easy to guess. Choose a longer one.' };
    console.error('password change failed:', error.code, error.message);
    return { error: 'Your new password couldn’t be saved just now. Try again in a moment.' };
  }
  return { done: 'Your new password is saved. Use it next time you sign in.' };
}
