import type { Metadata } from 'next';
import { ago, dateTime } from '@/lib/admin-format';
import { secretKey } from '@/lib/env.server';
import { displayName, requireStaff, ROLE_LABEL, ROLE_SUMMARY, ROLES } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import { InviteForm, MemberControls } from './forms';

export const metadata: Metadata = { title: 'Team' };

/* the team: everyone sees who is on it; the owner invites people, gives roles and switches access on and off */
export default async function TeamPage() {
  const me = await requireStaff();
  const owner = me.profile.role === 'OWNER';
  const supabase = await supabaseServer();
  const { data: team, error } = await supabase.rpc('team_members');
  const keyed = !!secretKey();

  return (
    <>
      <p className="label">The showroom’s team</p>
      <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Team</h1>

      {owner && (
        <section className="mt-10 rounded-3xl bg-panel px-[clamp(20px,4vw,40px)] py-[clamp(24px,4vw,36px)] shadow-[inset_0_0_0_1px_var(--line)]" aria-labelledby="invite">
          <h2 id="invite" className="text-[clamp(26px,3vw,34px)]">Invite someone</h2>
          {keyed ? (
            <>
              <p className="mt-2 mb-7 max-w-[64ch] text-muted">They get a login with the role you choose, and you get a one-time link to send them by WhatsApp or email. Opening it, they choose their password.</p>
              <InviteForm />
            </>
          ) : (
            <p className="mt-3 max-w-[64ch] text-muted">
              Invitations need the server key, which isn’t set on this server yet: add <code className="text-champagne-hi">SUPABASE_SECRET_KEY</code> to its settings (SETUP.md explains where).
              Until then, roles and access for people already on the team can still be changed below.
            </p>
          )}
        </section>
      )}

      <section className="mt-12" aria-labelledby="members">
        <h2 id="members" className="sr-only">Members</h2>
        {error || !team ? (
          <p role="alert" className="text-muted">The team couldn’t be loaded just now. Refresh the page in a moment.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]">
            {team.map(m => {
              const self = m.id === me.id;
              const status = !m.active ? 'Switched off' : !m.role ? 'No role: no access' : !m.joined ? 'Invited, hasn’t joined yet' : null;
              return (
                <li key={m.id} className={'[display:grid] gap-4 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center' + (m.active ? '' : ' opacity-60')}>
                  <div className="min-w-0">
                    <p className="m-0 text-[18px] text-ink">{displayName(m)}{self && <span className="text-muted"> (you)</span>}</p>
                    <p className="m-0 mt-1 break-words text-[14px] text-muted">
                      {[m.full_name.trim() ? m.email : null, m.phone].filter(Boolean).join(' · ') || 'No name yet'}
                    </p>
                    <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px]">
                      <span className="text-champagne-hi">{m.role ? ROLE_LABEL[m.role] : 'No role'}</span>
                      {status && <span className="rounded-full px-3 py-0.5 text-[12.5px] text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]">{status}</span>}
                      {m.last_sign_in_at && <span className="text-muted">Last signed in <time dateTime={m.last_sign_in_at} title={dateTime(m.last_sign_in_at)}>{ago(m.last_sign_in_at)}</time></span>}
                    </p>
                  </div>
                  {owner && !self && (
                    <MemberControls id={m.id} name={displayName(m)} role={m.role} active={m.active} canLink={keyed && m.active} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14" aria-labelledby="roles">
        <h2 id="roles" className="text-[clamp(26px,3vw,34px)]">What each role can do</h2>
        <dl className="mt-6 [display:grid] gap-x-10 gap-y-5 sm:grid-cols-2">
          {ROLES.map(r => (
            <div key={r}>
              <dt className="text-champagne-hi">{ROLE_LABEL[r]}</dt>
              <dd className="m-0 mt-1 text-[15px] text-muted">{ROLE_SUMMARY[r]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
