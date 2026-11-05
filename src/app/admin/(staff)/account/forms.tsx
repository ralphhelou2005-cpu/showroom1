'use client';
import { useActionState } from 'react';
import { Field, Message, Submit, selectClass } from '@/components/admin/forms';
import { changePassword, saveDetails } from './actions';

export function DetailsForm({ name, phone, locale }: { name: string; phone: string; locale: string }) {
  const [state, action] = useActionState(saveDetails, null);
  return (
    <form action={action} className="[display:grid] gap-7 md:grid-cols-2" noValidate>
      <Field label="Your name" hint="As your colleagues see it."><input name="full_name" autoComplete="name" defaultValue={state?.values?.full_name ?? name} required maxLength={120} /></Field>
      <Field label="Mobile" hint="International form, e.g. +961 3 123 456."><input name="phone" type="tel" autoComplete="tel" defaultValue={state?.values?.phone ?? phone} /></Field>
      <Field label="Language for messages to you" hint="The dashboard itself is in English for now.">
        <select name="preferred_locale" className={selectClass} defaultValue={state?.values?.preferred_locale ?? locale} key={state?.values?.preferred_locale ?? locale}>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <Message state={state} />
        <Submit busy="Saving…" className="btn md:w-auto md:px-12">Save my details</Submit>
      </div>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="[display:grid] gap-7 md:grid-cols-2" noValidate key={state?.done ? 'saved' : 'form'}>
      <div className="md:col-span-2 md:max-w-[calc(50%-14px)]">
        <Field label="Current password"><input name="current" type="password" autoComplete="current-password" required /></Field>
      </div>
      <Field label="New password" hint="At least 10 characters."><input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} /></Field>
      <Field label="The new password again"><input name="repeat" type="password" autoComplete="new-password" required /></Field>
      <div className="md:col-span-2">
        <Message state={state} />
        <Submit busy="Saving…" className="btn md:w-auto md:px-12">Change my password</Submit>
      </div>
    </form>
  );
}
