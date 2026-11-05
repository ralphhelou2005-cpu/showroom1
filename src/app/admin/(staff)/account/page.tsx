import type { Metadata } from 'next';
import { requireStaff, ROLE_LABEL, ROLE_SUMMARY } from '@/lib/staff';
import { DetailsForm, NewPasswordForm } from './forms';

export const metadata: Metadata = { title: 'Your account' };

export default async function AccountPage() {
  const me = await requireStaff();
  const p = me.profile;
  const panel = 'mt-8 rounded-3xl bg-panel px-[clamp(20px,4vw,40px)] py-[clamp(24px,4vw,36px)] shadow-[inset_0_0_0_1px_var(--line)]';
  return (
    <>
      <p className="label">Signed in as {me.email}</p>
      <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Your account</h1>
      <p className="mt-4 text-muted"><span className="text-champagne-hi">{ROLE_LABEL[p.role]}</span>: {ROLE_SUMMARY[p.role].charAt(0).toLowerCase() + ROLE_SUMMARY[p.role].slice(1)}{p.role !== 'OWNER' && ' Only the owner changes roles.'}</p>
      <section className={panel} aria-labelledby="details">
        <h2 id="details" className="mb-7 text-[clamp(26px,3vw,34px)]">Your details</h2>
        <DetailsForm name={p.full_name} phone={p.phone ?? ''} locale={p.preferred_locale} />
      </section>
      <section className={panel} aria-labelledby="password">
        <h2 id="password" className="mb-7 text-[clamp(26px,3vw,34px)]">Password</h2>
        <NewPasswordForm />
      </section>
    </>
  );
}
