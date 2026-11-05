'use client';
import { useActionState, useState } from 'react';
import { Field, Message, Submit, selectClass, smallBtn, type FormState } from '@/components/admin/forms';
import { ROLE_LABEL as LABEL, ROLES } from '@/lib/roles';
import { invite, newSignInLink, setActive, setRole } from './actions';

/* a fresh form after each invitation ("Invite someone else") */
export function InviteForm() {
  const [round, setRound] = useState(0);
  return <InviteOnce key={round} again={() => setRound(r => r + 1)} />;
}

function InviteOnce({ again }: { again: () => void }) {
  const [state, action] = useActionState(invite, null);
  if (state?.link) return <LinkPanel state={state} again={again} />;
  return <InviteFields action={action} state={state} />;
}

function InviteFields({ action, state }: { action: (f: FormData) => void; state: FormState }) {
  const v = state?.values;
  return (
    <form action={action} className="[display:grid] gap-7 md:grid-cols-2" noValidate>
      <Field label="Name"><input name="full_name" autoComplete="off" required maxLength={120} defaultValue={v?.full_name} /></Field>
      <Field label="Email" hint="The address they’ll sign in with."><input name="email" type="email" autoComplete="off" required defaultValue={v?.email} /></Field>
      <Field label="Role">
        <select name="role" className={selectClass} defaultValue={v?.role || 'SALESPERSON'} key={v?.role}>
          {ROLES.map(r => <option key={r} value={r}>{LABEL[r]}</option>)}
        </select>
      </Field>
      <Field label="Mobile (optional)" hint="To open WhatsApp straight to them, e.g. +961 3 123 456."><input name="phone" type="tel" autoComplete="off" defaultValue={v?.phone} /></Field>
      <div className="md:col-span-2">
        <Message state={state} />
        <Submit busy="Inviting…" className="btn md:w-auto md:px-12">Invite</Submit>
      </div>
    </form>
  );
}

/* the one-time link, shown once: copy it or open WhatsApp with it written out */
function LinkPanel({ state, again }: { state: FormState; again?: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = state!.link!;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div role="status" className="[display:grid] gap-4">
      <p className="m-0 text-champagne-hi">{state!.done}</p>
      <input readOnly value={link.url} aria-label={`Sign-in link for ${link.name}`} onFocus={e => e.currentTarget.select()} className="text-[14px]" />
      <div className="flex flex-wrap gap-3">
        <button type="button" className={smallBtn} onClick={copy}>{copied ? 'Copied' : 'Copy the link'}</button>
        <a className={smallBtn} href={link.whatsapp} target="_blank" rel="noopener">Send on WhatsApp</a>
        {again && <button type="button" className={smallBtn} onClick={again}>Invite someone else</button>}
      </div>
      <p className="m-0 text-[13px] text-muted">The link works once, and expires after an hour unless you’ve changed that in Supabase. You can make a new one from the list at any time.</p>
    </div>
  );
}

export function MemberControls({ id, name, role, active, canLink }: { id: string; name: string; role: keyof typeof LABEL | null; active: boolean; canLink: boolean }) {
  const [roleState, roleAction] = useActionState(setRole, null);
  const [activeState, activeAction] = useActionState(setActive, null);
  const [linkState, linkAction] = useActionState(newSignInLink, null);
  const last = [linkState, activeState, roleState].find(s => s?.error || s?.done);
  return (
    <div className="[display:grid] gap-3 lg:justify-items-end">
      <div className="flex flex-wrap items-end gap-3">
        {active && (
          <form action={roleAction} className="flex items-end gap-3">
            <input type="hidden" name="id" value={id} />
            <label className="block min-w-[190px]">
              <span className="sr-only">Role for {name}</span>
              <select name="role" className={selectClass + ' min-h-10 text-[15px]'} defaultValue={role ?? ''}>
                {!role && <option value="" disabled>Choose a role</option>}
                {ROLES.map(r => <option key={r} value={r}>{LABEL[r]}</option>)}
              </select>
            </label>
            <Submit className={smallBtn} busy="Saving…">Save role</Submit>
          </form>
        )}
        {canLink && role && (
          <form action={linkAction}>
            <input type="hidden" name="id" value={id} />
            <Submit className={smallBtn} busy="Making…">New sign-in link</Submit>
          </form>
        )}
        <form action={activeAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={active ? 'false' : 'true'} />
          <Submit className={smallBtn} busy="Saving…">{active ? 'Switch off' : 'Switch on'}</Submit>
        </form>
      </div>
      {linkState?.link ? <div className="w-full max-w-[560px]"><LinkPanel state={linkState} /></div> : last && <div className="lg:text-end"><Message state={last} /></div>}
    </div>
  );
}
