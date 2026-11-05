import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import { currentStaff, displayName, ROLE_LABEL } from '@/lib/staff';
import { signOut } from '../(auth)/actions';

/* Every dashboard page: the person must be signed in, have a role and be switched on. The pages it lists are
   only the ones that exist; each later part of the platform adds its own. */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const me = await currentStaff();
  if (!me) redirect('/admin/login');
  const p = me.profile;
  const signOutButton = (
    <form action={signOut}>
      <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 font-body text-[13px] tracking-[.12em] text-muted uppercase hover:text-champagne-hi">Sign out</button>
    </form>
  );

  if (!p?.role || !p.active) {
    return (
      <main id="main" className="[display:grid] min-h-dvh place-items-center px-[var(--gutter)]">
        <div className="max-w-[520px] text-center">
          <p className="label">Milcar dashboard</p>
          <h1 className="mt-4 text-[clamp(34px,6vw,48px)]">{p && !p.active ? 'Your access is switched off' : 'No access yet'}</h1>
          <p className="mt-4 mb-8 text-muted">
            {p && !p.active
              ? 'The owner has switched off this login. If you need it back, ask them to switch it on again.'
              : `You’re signed in as ${me.email}, but this login hasn’t been given a role. Ask the owner to give you access.`}
          </p>
          <div className="flex justify-center">{signOutButton}</div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <a className="skip" href="#main">Skip to content</a>
      <header className="border-b border-line md:sticky md:top-0 md:h-dvh md:border-e md:border-b-0">
        <div className="flex h-full flex-col gap-6 px-[var(--gutter)] pt-6 pb-4 md:px-7 md:py-9">
          <div className="flex items-baseline justify-between gap-4 md:block">
            <a href="/admin" className="font-display text-[28px] tracking-[.04em] text-ink no-underline">Milcar</a>
            <a href="/" target="_blank" rel="noopener" className="text-[13px] text-champagne no-underline hover:underline md:mt-2 md:block">View the website ↗</a>
          </div>
          <AdminNav />
          <div className="mt-auto hidden md:block">
            <p className="text-[15px] text-ink">{displayName(p)}</p>
            <p className="mb-4 text-[13px] text-muted">{ROLE_LABEL[p.role]}</p>
            {signOutButton}
          </div>
        </div>
      </header>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4 border-b border-line px-[var(--gutter)] py-3 md:hidden">
          <p className="text-[14px] text-muted"><span className="text-ink">{displayName(p)}</span> · {ROLE_LABEL[p.role]}</p>
          {signOutButton}
        </div>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1180px] px-[var(--gutter)] py-[clamp(28px,5vw,56px)] outline-none">{children}</main>
      </div>
    </div>
  );
}
