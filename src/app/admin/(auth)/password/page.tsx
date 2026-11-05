import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentStaff } from '@/lib/staff';
import { PasswordForm } from '../forms';

export const metadata: Metadata = { title: 'Choose your password' };

/* after an invitation or a password link: the person is signed in by the link and chooses their password */
export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await currentStaff();
  if (!me) redirect('/admin/login');
  const welcome = (await searchParams).welcome === '1';
  const name = me.profile?.full_name ?? '';
  return (
    <>
      <h1 className="text-[clamp(34px,6vw,44px)]">{welcome ? `Welcome${name ? ', ' + name.split(' ')[0] : ''}` : 'A new password'}</h1>
      <p className="mt-3 mb-8 text-muted">{welcome ? 'Choose the password you’ll sign in with, with your email ' : 'Choose a new password for '}<span className="text-ink">{me.email}</span>.</p>
      <PasswordForm welcome={welcome} name={name} />
    </>
  );
}
