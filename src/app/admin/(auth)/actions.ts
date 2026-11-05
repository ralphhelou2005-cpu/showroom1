'use server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { typed, type FormState } from '@/lib/form-state';
import { publicEnv } from '@/lib/env';
import { clientIp, currentStaff, safeNext, withinLimit } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';

/* Signing in, a forgotten password, following a one-time link, choosing a password, signing out.
   Every answer is worded so it never reveals whether an email has a login. */

const email = z.string().trim().toLowerCase().pipe(z.email());
const password = z.string().min(10, 'Your password needs at least 10 characters.').max(72, 'Your password can have at most 72 characters.');

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'email');
  const input = z.object({ email, password: z.string().min(1).max(200), next: z.string().optional() }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: 'Enter your email and your password.', values };
  const ip = await clientIp();
  if (!(await withinLimit('signin:ip:' + ip, 900, 30)) || !(await withinLimit('signin:email:' + input.data.email, 900, 10)))
    return { error: 'Too many attempts. Wait fifteen minutes, then try again.', values };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: input.data.email, password: input.data.password });
  if (error) {
    if (error.code === 'invalid_credentials') return { error: 'That email and password don’t match.', values };
    if (error.code === 'user_banned') return { error: 'This login has been switched off. Ask the owner if you need it back.', values };
    if (error.code === 'over_request_rate_limit' || error.status === 429) return { error: 'Too many attempts. Wait a few minutes, then try again.', values };
    console.error('sign-in failed:', error.code, error.message);
    return { error: 'Signing in didn’t work just now. Try again in a moment.', values };
  }
  redirect(safeNext(input.data.next));
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const input = email.safeParse(form.get('email'));
  if (!input.success) return { error: 'Enter the email you sign in with.', values: typed(form, 'email') };
  const ip = await clientIp();
  const sent = { done: 'If that email has a Milcar login, a link to choose a new password is on its way. It works once. Nothing after a few minutes? Ask the owner for a new sign-in link.' };
  if (!(await withinLimit('reset:ip:' + ip, 3600, 10)) || !(await withinLimit('reset:email:' + input.data, 3600, 3))) return sent;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(input.data, { redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/admin/auth/confirm` });
  if (error && error.status !== 429) console.error('password reset email failed:', error.code, error.message);
  return sent;
}

const LINK_TYPES = ['recovery', 'invite', 'magiclink', 'email'] as const;

/* The one-time link opens a page with a button, and only the button uses it up: WhatsApp and email scanners
   open links to preview them, and would otherwise spend the link before the person does. */
export async function followLink(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  const tokenHash = String(form.get('token_hash') ?? ''), code = String(form.get('code') ?? '');
  const type = String(form.get('type') ?? '') as EmailOtpType;
  let failed = true;
  if (tokenHash && (LINK_TYPES as readonly string[]).includes(type)) failed = !!(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) failed = !!(await supabase.auth.exchangeCodeForSession(code)).error;
  if (failed) return { error: 'This link has already been used or has expired. Ask the owner for a new one, or request a new password below.' };
  redirect(type === 'invite' || form.get('welcome') ? '/admin/password?welcome=1' : '/admin/password');
}

export async function choosePassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await currentStaff();
  if (!me) redirect('/admin/login');
  const values = typed(form, 'full_name');
  const input = z.object({
    password,
    repeat: z.string(),
    full_name: z.string().trim().max(120).optional(),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message, values };
  if (input.data.password !== input.data.repeat) return { error: 'The two passwords are different.', values };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: input.data.password });
  if (error) {
    if (error.code === 'same_password') return { error: 'Choose a password different from your current one.', values };
    if (error.code === 'weak_password') return { error: 'That password is too easy to guess. Choose a longer one.', values };
    console.error('password change failed:', error.code, error.message);
    return { error: 'Saving your password didn’t work just now. Try again in a moment.', values };
  }
  if (input.data.full_name) await supabase.from('profiles').update({ full_name: input.data.full_name }).eq('id', me.id);
  redirect('/admin');
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
