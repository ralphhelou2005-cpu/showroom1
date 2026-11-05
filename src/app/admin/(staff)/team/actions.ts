'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { typed, type FormState } from '@/lib/form-state';
import { publicEnv } from '@/lib/env';
import { secretKey } from '@/lib/env.server';
import { whatsappLink } from '@/lib/labels';
import { requireStaff, ROLE_LABEL, ROLES, withinLimit } from '@/lib/staff';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';

/* The owner's team actions. Each one checks the owner on the server first; the database checks again
   (only the owner changes roles and access, and the last owner can never be removed).
   Creating a login and making a one-time link are the two things only the server's key can do: everything
   else runs as the owner, so the audit log records who did it. */

const role = z.enum(ROLES as [string, ...string[]]);
const phone = z.string().trim().transform(s => s.replace(/[\s().-]/g, '')).pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, 'Write the phone number in international form, like +961 3 123 456.'));
const id = z.uuid();

const NO_KEY = 'Invitations and sign-in links need the server key (SUPABASE_SECRET_KEY), which isn’t set on this server yet.';
const ERRORS: Record<string, string> = {
  'profile.last_owner': 'The team needs at least one active owner. Make someone else an owner first.',
  'profile.owner_only': 'Only the owner can change roles and access.',
};
const dbError = (e: { message: string }, fallback: string) => ERRORS[e.message] ?? (console.error('team action failed:', e.message), fallback);

async function asOwner() {
  const me = await requireStaff();
  return me.profile.role === 'OWNER' ? me : null;
}

/* a link that signs the person in once and lets them choose a password (see /admin/auth/confirm) */
async function signInLink(email: string, welcome: boolean, name: string, phoneNumber: string | null) {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: 'recovery', email });
  if (error || !data.properties?.hashed_token) {
    console.error('sign-in link failed:', error?.code, error?.message);
    return null;
  }
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL}/admin/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery${welcome ? '&welcome=1' : ''}`;
  const first = name.split(' ')[0] || 'there';
  const text = welcome
    ? `Hello ${first}, here is your invitation to the Milcar dashboard. Open it to choose your password (it works once):\n${url}`
    : `Hello ${first}, here is a new sign-in link for the Milcar dashboard. Open it to choose a new password (it works once):\n${url}`;
  return { url, whatsapp: phoneNumber ? whatsappLink(phoneNumber, text) : 'https://wa.me/?text=' + encodeURIComponent(text), name };
}

export async function invite(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'full_name', 'email', 'role', 'phone');
  const me = await asOwner();
  if (!me) return { error: 'Only the owner can invite people.' };
  const input = z.object({
    full_name: z.string().trim().min(1, 'Write their name.').max(120),
    email: z.string().trim().toLowerCase().pipe(z.email('Write a valid email address.')),
    role,
    phone: z.union([z.literal(''), phone]).optional(),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message, values };
  if (!secretKey()) return { error: NO_KEY, values };
  if (!(await withinLimit('invite:' + me.id, 3600, 20))) return { error: 'That’s a lot of invitations in an hour. Wait a little, then try again.', values };
  const { full_name, email, phone: tel } = input.data;

  const admin = supabaseAdmin();
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name } });
  if (created.error || !created.data.user) {
    if (created.error?.code === 'email_exists' || created.error?.status === 422) return { error: 'This email already has a login: it’s in the list below. Give it a role or send a new sign-in link from there.', values };
    console.error('invitation failed:', created.error?.code, created.error?.message);
    return { error: 'The invitation couldn’t be created just now. Try again in a moment.', values };
  }
  const newId = created.data.user.id;
  /* the role is given by the owner's own login, so the audit log shows who gave it */
  const supabase = await supabaseServer();
  const { error } = await supabase.from('profiles').update({ full_name, role: input.data.role as never, phone: tel || null }).eq('id', newId);
  if (error) {
    await admin.auth.admin.deleteUser(newId);
    return { error: dbError(error, 'The invitation couldn’t be created just now. Try again in a moment.'), values };
  }
  const link = await signInLink(email, true, full_name, tel || null);
  revalidatePath('/admin/team');
  revalidatePath('/admin');
  if (!link) return { done: `${full_name} is on the team as ${ROLE_LABEL[input.data.role as keyof typeof ROLE_LABEL].toLowerCase()}, but the link couldn’t be made. Use “New sign-in link” in the list.` };
  return { done: `${full_name} is on the team as ${ROLE_LABEL[input.data.role as keyof typeof ROLE_LABEL].toLowerCase()}. Send them this link:`, link };
}

export async function setRole(_: FormState, form: FormData): Promise<FormState> {
  const me = await asOwner();
  if (!me) return { error: 'Only the owner can change roles.' };
  const input = z.object({ id, role }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: 'Choose a role.' };
  if (input.data.id === me.id) return { error: 'Ask another owner to change your own role.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('profiles').update({ role: input.data.role as never }).eq('id', input.data.id);
  if (error) return { error: dbError(error, 'The role couldn’t be changed just now. Try again in a moment.') };
  revalidatePath('/admin/team');
  revalidatePath('/admin');
  return { done: 'Saved.' };
}

export async function setActive(_: FormState, form: FormData): Promise<FormState> {
  const me = await asOwner();
  if (!me) return { error: 'Only the owner can switch people off.' };
  const input = z.object({ id, active: z.enum(['true', 'false']) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: 'Something was missing. Refresh the page and try again.' };
  if (input.data.id === me.id) return { error: 'You can’t switch off your own login.' };
  const active = input.data.active === 'true';
  const supabase = await supabaseServer();
  const { error } = await supabase.from('profiles').update({ active }).eq('id', input.data.id);
  if (error) return { error: dbError(error, 'That couldn’t be saved just now. Try again in a moment.') };
  /* the database refuses a switched-off person everything at once; with the server key their login is also
     blocked, so they can't sign in again until they are switched back on */
  if (secretKey()) {
    const { error: banError } = await supabaseAdmin().auth.admin.updateUserById(input.data.id, { ban_duration: active ? 'none' : '876000h' });
    if (banError) console.error('login block failed:', banError.code, banError.message);
  }
  revalidatePath('/admin/team');
  revalidatePath('/admin');
  return { done: active ? 'Switched on again.' : 'Switched off. They can no longer see or change anything.' };
}

export async function newSignInLink(_: FormState, form: FormData): Promise<FormState> {
  const me = await asOwner();
  if (!me) return { error: 'Only the owner can make sign-in links.' };
  const input = z.object({ id }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: 'Something was missing. Refresh the page and try again.' };
  if (!secretKey()) return { error: NO_KEY };
  if (!(await withinLimit('link:' + me.id, 3600, 30))) return { error: 'That’s a lot of links in an hour. Wait a little, then try again.' };
  const supabase = await supabaseServer();
  const { data: team } = await supabase.rpc('team_members');
  const member = team?.find(m => m.id === input.data.id);
  if (!member?.email) return { error: 'That person isn’t on the team any more. Refresh the page.' };
  if (!member.active) return { error: 'Switch them on first.' };
  const link = await signInLink(member.email, !member.joined, member.full_name, member.phone);
  if (!link) return { error: 'The link couldn’t be made just now. Try again in a moment.' };
  return { done: member.joined ? 'Send them this link to choose a new password:' : 'Send them this new invitation link:', link };
}
