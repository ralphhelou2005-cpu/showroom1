'use client';
import { useActionState, useState, useTransition } from 'react';
import { Field, Message, Submit, selectClass, smallBtn, type FormState } from '@/components/admin/forms';
import { LEAD_SOURCE, LEAD_STATUS } from '@/lib/crm-labels';
import { addNote, bookViewing, createLead, deleteNote, logContact, pickUpLead, setViewing, updateCustomer, updateLead } from './actions';

type Option = { id: string; name: string };
const textarea = 'block w-full resize-y border-0 border-b border-line-strong bg-transparent py-3 font-body text-[17px] font-light text-ink focus:border-champagne-hi focus:outline-none';

export function NewLeadForm({ customers, cars, team, canAssign }: { customers: (Option & { phone: string | null })[]; cars: Option[]; team: Option[]; canAssign: boolean }) {
  const [state, action] = useActionState(createLead, null);
  const v = state?.values;
  const [existing, setExisting] = useState(v?.customer_id ?? '');
  return (
    <form action={action} className="mt-8 [display:grid] gap-7 md:grid-cols-2" noValidate>
      <Field label="Customer">
        <select name="customer_id" className={selectClass} value={existing} onChange={e => setExisting(e.target.value)}>
          <option value="">A new customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
        </select>
      </Field>
      <Field label="Where they came from">
        <select name="source" className={selectClass} defaultValue={v?.source ?? 'phone'} key={v?.source}>
          {Object.entries(LEAD_SOURCE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      {!existing && <>
        <Field label="Name"><input name="full_name" defaultValue={v?.full_name} maxLength={120} /></Field>
        <Field label="Mobile" hint="International form, e.g. +961 3 123 456."><input name="phone" type="tel" defaultValue={v?.phone} /></Field>
        <Field label="Email (optional)"><input name="email" type="email" defaultValue={v?.email} /></Field>
      </>}
      <Field label="Car of interest">
        <select name="vehicle_id" className={selectClass} defaultValue={v?.vehicle_id ?? ''} key={v?.vehicle_id}>
          <option value="">None yet</option>{cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {canAssign && (
        <Field label="Assigned to">
          <select name="assigned_to" className={selectClass} defaultValue={v?.assigned_to ?? ''} key={v?.assigned_to}>
            <option value="">Not assigned</option>{team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}
      <div className="md:col-span-2"><Field label="What they asked (optional)"><textarea name="message" rows={3} maxLength={4000} defaultValue={v?.message} className={textarea} /></Field></div>
      <div className="md:col-span-2"><Message state={state} /><Submit className="btn md:w-auto md:px-12" busy="Saving…">Add the lead</Submit></div>
    </form>
  );
}

export function LeadForm({ lead, cars, team, canAssign }: {
  lead: { id: string; status: string; vehicle_id: string | null; assigned_to: string | null; next_follow_up: string; lost_reason: string | null };
  cars: Option[]; team: Option[]; canAssign: boolean;
}) {
  const [state, action] = useActionState(updateLead, null);
  const [status, setStatus] = useState(lead.status);
  return (
    <form action={action} className="[display:grid] gap-6" noValidate>
      <input type="hidden" name="id" value={lead.id} />
      <Field label="Status">
        <select name="status" className={selectClass} value={status} onChange={e => setStatus(e.target.value)}>
          {Object.entries(LEAD_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      {status === 'lost' && <Field label="Why it was lost (optional)"><input name="lost_reason" defaultValue={lead.lost_reason ?? ''} maxLength={500} /></Field>}
      {status !== 'lost' && <input type="hidden" name="lost_reason" value="" />}
      <Field label="Car of interest">
        <select name="vehicle_id" className={selectClass} defaultValue={lead.vehicle_id ?? ''}>
          <option value="">None yet</option>{cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {canAssign && (
        <Field label="Assigned to">
          <select name="assigned_to" className={selectClass} defaultValue={lead.assigned_to ?? ''}>
            <option value="">Not assigned</option>{team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Next follow-up" hint="Showroom time. It appears in “Follow-up due” when it comes."><input type="datetime-local" name="next_follow_up_at" defaultValue={lead.next_follow_up} /></Field>
      <Message state={state} />
      <Submit className="btn" busy="Saving…">Save</Submit>
    </form>
  );
}

export function PickUp({ id }: { id: string }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (
    <div><button type="button" className="btn mt-0 w-full" disabled={pending} onClick={() => start(async () => setState(await pickUpLead(id)))}>Pick up this lead</button><Message state={state} /></div>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action] = useActionState(addNote, null);
  return (
    <form action={action} className="[display:grid] gap-3" key={state?.done ? Math.random() : 'note'}>
      <input type="hidden" name="lead_id" value={leadId} />
      <label className="block"><span className="label">Add a note</span><textarea name="body" rows={3} maxLength={4000} defaultValue={state?.values?.body} className={textarea} /></label>
      <Message state={state} />
      <Submit className={smallBtn + ' justify-self-start'} busy="Adding…">Add the note</Submit>
    </form>
  );
}

export function DeleteNote({ id }: { id: string }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (<>
    <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-body text-[13px] text-muted underline" disabled={pending} onClick={() => start(async () => setState(await deleteNote(id)))}>Delete</button>
    {state?.error && <span role="alert" className="ms-2 text-[13px]">{state.error}</span>}
  </>);
}

export function ContactForm({ leadId }: { leadId: string }) {
  const [state, action] = useActionState(logContact, null);
  return (
    <form action={action} className="[display:grid] gap-3" key={state?.done ? Math.random() : 'contact'}>
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="[display:grid] gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <label className="block"><span className="label">What happened</span>
          <select name="type" className={selectClass} defaultValue="call">
            <option value="call">A call</option><option value="whatsapp_message">A WhatsApp</option><option value="email">An email</option><option value="meeting">A meeting</option>
          </select></label>
        <label className="block"><span className="label">In a few words</span><input name="summary" maxLength={1000} placeholder="e.g. Wants a test drive on Saturday" /></label>
      </div>
      <Message state={state} />
      <Submit className={smallBtn + ' justify-self-start'} busy="Adding…">Add to the history</Submit>
    </form>
  );
}

export function BookForm({ leadId, team, defaultMinutes }: { leadId: string; team: Option[]; defaultMinutes: number }) {
  const [state, action] = useActionState(bookViewing, null);
  const v = state?.values;
  return (
    <form action={action} className="[display:grid] gap-5 md:grid-cols-2" noValidate key={state?.done ? 'booked' : 'book'}>
      <input type="hidden" name="lead_id" value={leadId} />
      <Field label="Day and time" hint="Showroom time, inside the opening hours."><input type="datetime-local" name="starts_at" defaultValue={v?.starts_at} /></Field>
      <Field label="How long (minutes)"><input name="minutes" inputMode="numeric" defaultValue={v?.minutes ?? String(defaultMinutes)} /></Field>
      <Field label="With">
        <select name="assigned_to" className={selectClass} defaultValue={v?.assigned_to ?? ''}><option value="">Me</option>{team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      </Field>
      <Field label="Note for the team (optional)"><input name="internal_note" maxLength={2000} defaultValue={v?.internal_note} /></Field>
      <div className="md:col-span-2"><Message state={state} /><Submit className={smallBtn} busy="Booking…">Book the viewing</Submit></div>
    </form>
  );
}

/* a viewing's actions: confirm (managers), move, mark done or not, cancel */
export function ViewingActions({ id, status, startsInput, canConfirm }: { id: string; status: string; startsInput: string; canConfirm: boolean }) {
  const [state, action] = useActionState(setViewing, null);
  const [mode, setMode] = useState<'move' | 'cancel' | null>(null);
  const active = ['requested', 'confirmed', 'rescheduled'].includes(status);
  if (!active) return state ? <Message state={state} /> : null;
  return (
    <div className="[display:grid] gap-3">
      <div className="flex flex-wrap gap-2">
        {canConfirm && status !== 'confirmed' && <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="confirmed" /><Submit className={smallBtn} busy="…">Confirm</Submit></form>}
        <button type="button" className={smallBtn} onClick={() => setMode(mode === 'move' ? null : 'move')}>Move…</button>
        <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="completed" /><Submit className={smallBtn} busy="…">Done</Submit></form>
        <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="no_show" /><Submit className={smallBtn} busy="…">Didn’t come</Submit></form>
        <button type="button" className={smallBtn} onClick={() => setMode(mode === 'cancel' ? null : 'cancel')}>Cancel…</button>
      </div>
      {mode === 'move' && (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="block"><span className="label">New day and time</span><input type="datetime-local" name="starts_at" defaultValue={startsInput} /></label>
          <Submit className={smallBtn} busy="Moving…">Move it</Submit>
        </form>
      )}
      {mode === 'cancel' && (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="cancelled" />
          <label className="block min-w-[240px] flex-1"><span className="label">Why (optional)</span><input name="reason" maxLength={500} /></label>
          <Submit className={smallBtn} busy="Cancelling…">Cancel the viewing</Submit>
        </form>
      )}
      <Message state={state} />
    </div>
  );
}

export function CustomerForm({ c }: { c: { id: string; full_name: string; phone: string | null; email: string | null; preferred_locale: string; preferred_contact: string | null; marketing_consent: boolean } }) {
  const [state, action] = useActionState(updateCustomer, null);
  const v = state?.values;
  return (
    <form action={action} className="[display:grid] gap-6 md:grid-cols-2" noValidate>
      <input type="hidden" name="id" value={c.id} />
      <Field label="Name"><input name="full_name" defaultValue={v?.full_name ?? c.full_name} maxLength={120} /></Field>
      <Field label="Mobile"><input name="phone" type="tel" defaultValue={v?.phone ?? c.phone ?? ''} /></Field>
      <Field label="Email"><input name="email" type="email" defaultValue={v?.email ?? c.email ?? ''} /></Field>
      <Field label="Language">
        <select name="preferred_locale" className={selectClass} defaultValue={v?.preferred_locale ?? c.preferred_locale}><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option></select>
      </Field>
      <Field label="Best way to reach them">
        <select name="preferred_contact" className={selectClass} defaultValue={v?.preferred_contact ?? c.preferred_contact ?? 'phone'}><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>
      </Field>
      <label className="flex items-center gap-3 self-end pb-3"><input type="checkbox" name="marketing_consent" defaultChecked={c.marketing_consent} className="h-5 w-5 min-h-0 accent-[var(--champagne)]" /><span>Agreed to hear about new cars</span></label>
      <div className="md:col-span-2"><Message state={state} /><Submit className={smallBtn} busy="Saving…">Save</Submit></div>
    </form>
  );
}

export function DangerButton({ label, confirm, run }: { label: string; confirm: string; run: () => Promise<FormState> }) {
  const [ask, setAsk] = useState(false);
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return ask ? (
    <div className="[display:grid] gap-2"><p className="m-0 text-[14px]">{confirm}</p>
      <span className="flex gap-2"><button type="button" className={smallBtn + ' shadow-[inset_0_0_0_1px_rgba(200,32,42,.7)]'} disabled={pending} onClick={() => start(async () => setState(await run()))}>Delete for good</button>
        <button type="button" className={smallBtn} onClick={() => setAsk(false)}>Keep it</button></span><Message state={state} /></div>
  ) : <button type="button" className={smallBtn} onClick={() => setAsk(true)}>{label}</button>;
}

