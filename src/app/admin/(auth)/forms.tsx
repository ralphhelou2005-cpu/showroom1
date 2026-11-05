'use client';
import { useActionState } from 'react';
import { Field, Message, Submit } from '@/components/admin/forms';
import { choosePassword, followLink, requestReset, signIn } from './actions';

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="[display:grid] gap-7" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email"><input name="email" type="email" autoComplete="username" required autoFocus defaultValue={state?.values?.email} /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required /></Field>
      <Message state={state} />
      <Submit busy="Signing in…">Sign in</Submit>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(requestReset, null);
  return (
    <form action={action} className="[display:grid] gap-7" noValidate>
      <Field label="Email"><input name="email" type="email" autoComplete="username" required autoFocus defaultValue={state?.values?.email} /></Field>
      <Message state={state} />
      {!state?.done && <Submit busy="Sending…">Send me a link</Submit>}
    </form>
  );
}

export function ContinueForm({ tokenHash, type, code, welcome }: { tokenHash?: string; type?: string; code?: string; welcome: boolean }) {
  const [state, action] = useActionState(followLink, null);
  return (
    <form action={action} className="[display:grid] gap-7">
      {welcome && <input type="hidden" name="welcome" value="1" />}
      {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}
      {type && <input type="hidden" name="type" value={type} />}
      {code && <input type="hidden" name="code" value={code} />}
      <Message state={state} />
      {!state?.error && <Submit busy="Opening…">Continue</Submit>}
    </form>
  );
}

export function PasswordForm({ welcome, name }: { welcome: boolean; name: string }) {
  const [state, action] = useActionState(choosePassword, null);
  return (
    <form action={action} className="[display:grid] gap-7" noValidate>
      {welcome && <Field label="Your name" hint="As your colleagues will see it."><input name="full_name" autoComplete="name" defaultValue={state?.values?.full_name ?? name} required maxLength={120} /></Field>}
      <Field label="New password" hint="At least 10 characters. A short sentence is easy to remember and hard to guess.">
        <input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} autoFocus={!welcome} />
      </Field>
      <Field label="The same password again"><input name="repeat" type="password" autoComplete="new-password" required /></Field>
      <Message state={state} />
      <Submit busy="Saving…">{welcome ? 'Open the dashboard' : 'Save my password'}</Submit>
    </form>
  );
}
