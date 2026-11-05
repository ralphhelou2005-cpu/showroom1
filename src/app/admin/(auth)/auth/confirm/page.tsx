import type { Metadata } from 'next';
import { ContinueForm } from '../../forms';

export const metadata: Metadata = { title: 'Welcome', referrer: 'no-referrer' };

/* where invitations, new sign-in links and password emails lead. Nothing happens until the person presses
   Continue (see followLink in ../../actions.ts). */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; code?: string; welcome?: string }> }) {
  const { token_hash, type, code, welcome } = await searchParams;
  const usable = !!(token_hash && type) || !!code;
  const invite = type === 'invite' || welcome === '1';
  return (
    <>
      <h1 className="text-[clamp(34px,6vw,44px)]">{invite ? 'Welcome to Milcar' : 'Your sign-in link'}</h1>
      {usable ? (
        <>
          <p className="mt-3 mb-8 text-muted">{invite ? 'Continue to choose your password and open the dashboard.' : 'Continue to choose a new password.'} The link works once.</p>
          <ContinueForm tokenHash={token_hash} type={type} code={code} welcome={invite} />
        </>
      ) : (
        <p className="mt-3 text-muted">This link is incomplete. Open it again from the message you received, or <a className="text-champagne underline underline-offset-4" href="/admin/forgot">ask for a new one</a>.</p>
      )}
    </>
  );
}
