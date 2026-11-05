'use client';
import { useActionState, useState, useTransition } from 'react';
import { Field, Message, Submit, smallBtn, type FormState } from '@/components/admin/forms';
import { WEEKDAYS } from '@/lib/crm-labels';
import { addClosure, removeClosure, saveBusiness, saveHours, saveRecipients, saveRules } from './actions';

const save = 'btn md:w-auto md:px-12';

export function BusinessForm({ b }: { b: Record<string, string | null> }) {
  const [state, action] = useActionState(saveBusiness, null);
  const v = (k: string) => state?.values?.[k] ?? b[k] ?? '';
  return (
    <form action={action} className="[display:grid] gap-6 md:grid-cols-2" noValidate>
      <Field label="Name"><input name="name" defaultValue={v('name')} maxLength={120} /></Field>
      <Field label="Address"><input name="address" defaultValue={v('address')} maxLength={300} /></Field>
      <Field label="Map link" hint="From Google Maps: Share → Copy link."><input name="map_url" type="url" defaultValue={v('map_url')} /></Field>
      <Field label="Phone" hint="International form, e.g. +961 1 234 567."><input name="phone" type="tel" defaultValue={v('phone')} /></Field>
      <Field label="WhatsApp" hint="The number visitors message, in international form."><input name="whatsapp" type="tel" defaultValue={v('whatsapp')} /></Field>
      <Field label="Email"><input name="email" type="email" defaultValue={v('email')} /></Field>
      <Field label="Instagram link"><input name="instagram" type="url" defaultValue={v('instagram')} placeholder="https://instagram.com/…" /></Field>
      <div className="md:col-span-2"><Message state={state} /><Submit className={save} busy="Saving…">Save the details</Submit></div>
    </form>
  );
}

export function HoursForm({ hours }: { hours: { weekday: number; opens_at: string; closes_at: string }[] }) {
  const [state, action] = useActionState(saveHours, null);
  const at = (d: number, k: number) => hours.filter(h => h.weekday === d).sort((a, b) => a.opens_at.localeCompare(b.opens_at))[k - 1];
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <form action={action} className="[display:grid] gap-3" noValidate>
      {order.map(d => (
        <div key={d} className="[display:grid] items-end gap-3 sm:grid-cols-[120px_repeat(2,minmax(0,1fr))]">
          <span className="pb-3 text-ink">{WEEKDAYS[d]}</span>
          {[1, 2].map(k => (
            <span key={k} className="flex items-end gap-2">
              <label className="block flex-1"><span className="sr-only">{WEEKDAYS[d]} period {k} opens</span><input type="time" name={`d${d}o${k}`} defaultValue={at(d, k)?.opens_at.slice(0, 5)} /></label>
              <span className="pb-3 text-muted">–</span>
              <label className="block flex-1"><span className="sr-only">{WEEKDAYS[d]} period {k} closes</span><input type="time" name={`d${d}c${k}`} defaultValue={at(d, k)?.closes_at.slice(0, 5)} /></label>
            </span>
          ))}
        </div>
      ))}
      <p className="m-0 text-[13px] text-muted">Leave a day empty when the showroom is closed. A second period is for days with a break.</p>
      <Message state={state} /><Submit className={save} busy="Saving…">Save the hours</Submit>
    </form>
  );
}

export function ClosureForm() {
  const [state, action] = useActionState(addClosure, null);
  return (
    <form action={action} className="[display:grid] gap-5 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end" noValidate key={state?.done ? Math.random() : 'c'}>
      <Field label="From"><input type="datetime-local" name="starts_at" defaultValue={state?.values?.starts_at} /></Field>
      <Field label="Until"><input type="datetime-local" name="ends_at" defaultValue={state?.values?.ends_at} /></Field>
      <Field label="Why (optional)"><input name="reason" maxLength={200} defaultValue={state?.values?.reason} placeholder="e.g. Eid holiday" /></Field>
      <Submit className={smallBtn} busy="Adding…">Add</Submit>
      <div className="md:col-span-4"><Message state={state} /></div>
    </form>
  );
}

export function RemoveClosure({ id }: { id: string }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return <>{state?.error && <span role="alert" className="me-2 text-[13px]">{state.error}</span>}<button type="button" className={smallBtn} disabled={pending} onClick={() => start(async () => setState(await removeClosure(id)))}>Remove</button></>;
}

export function RulesForm({ r }: { r: Record<string, number | boolean | string> }) {
  const [state, action] = useActionState(saveRules, null);
  const v = (k: string) => state?.values?.[k] ?? String(r[k] ?? '');
  return (
    <form action={action} className="[display:grid] gap-6 md:grid-cols-2" noValidate>
      <Field label="A viewing lasts (minutes)"><input name="slot_minutes" inputMode="numeric" defaultValue={v('slot_minutes')} /></Field>
      <Field label="Notice needed (hours)" hint="How soon a visitor can ask for a time."><input name="min_notice_hours" inputMode="numeric" defaultValue={v('min_notice_hours')} /></Field>
      <Field label="How far ahead (days)"><input name="max_days_ahead" inputMode="numeric" defaultValue={v('max_days_ahead')} /></Field>
      <Field label="Viewings at the same time"><input name="max_parallel" inputMode="numeric" defaultValue={v('max_parallel')} /></Field>
      <label className="flex items-start gap-3 md:col-span-2"><input type="checkbox" name="requires_approval" defaultChecked={!!r.requires_approval} className="mt-1 h-5 w-5 min-h-0 accent-[var(--champagne)]" />
        <span><span className="text-ink">A manager confirms each request</span><span className="block text-[13px] text-muted">Off: a time chosen on the website is confirmed at once.</span></span></label>
      <div className="md:col-span-2"><Message state={state} /><Submit className={save} busy="Saving…">Save the rules</Submit></div>
    </form>
  );
}

export function RecipientsForm({ list }: { list: string[] }) {
  const [state, action] = useActionState(saveRecipients, null);
  return (
    <form action={action} className="[display:grid] gap-4" noValidate>
      <Field label="Who hears about new inquiries" hint="Emails separated by commas. Empty: the owner and the managers."><input name="recipients" defaultValue={state?.values?.recipients ?? list.join(', ')} /></Field>
      <Message state={state} /><Submit className={save} busy="Saving…">Save</Submit>
    </form>
  );
}
