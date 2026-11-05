'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { selectClass, smallBtn } from '@/components/admin/forms';
import { BODY_TYPES } from '@/lib/labels';
import {
  BODY_TYPE_KEYS, CURRENCIES, LOCALE_LABEL, LOCALES, PUBLICATION_LABEL, STATUS_LABEL, TEXT_FIELDS, TEXT_LIMIT, slugify,
  type EditorLocale, type EditorPayload, type Spec, type TextField,
} from '@/lib/vehicle-form';
import { createBrand } from '../brands/actions';
import { deleteVehicle, duplicateVehicle, saveVehicle } from './actions';

/* The inventory editor: one car, its text in three languages, its specs, and whether and how it shows on the
   website. Photos and videos are below it (MediaManager), once the car has been saved. */

export interface EditorInitial {
  id?: string;
  vehicle: Record<string, string | number | boolean | null>;
  translations: Record<EditorLocale, Record<TextField, string>>;
  specs: Spec[];
  legacy: boolean;
  publishedAddress: string | null;     // the car's page on the website, when it shows there
}

type Brand = { id: string; name: string; slug: string };
const FIELD_LABEL: Record<TextField, string> = {
  title: 'Name on the website', tagline: 'Tagline', description: 'Description', service_records: 'Service records',
  import_papers: 'Import papers', seo_title: 'Search engine title', seo_description: 'Search engine description',
};
const FIELD_HINT: Partial<Record<TextField, string>> = {
  title: 'Leave empty to use the brand and model.',
  service_records: 'What the buyer can see, e.g. “Full Ferrari main-dealer history”.',
  seo_title: 'Shown in Google results. Leave empty to use the name.',
  seo_description: 'One or two sentences for Google results.',
};
const str = (v: unknown) => (v == null ? '' : String(v));

export default function VehicleEditor({ initial, brands: brandList, featured, canEdit, canSell, canDelete, children }: {
  initial: EditorInitial; brands: Brand[]; featured: { id: string; name: string; rank: number | null; shown: boolean }[];
  canEdit: boolean; canSell: boolean; canDelete: boolean; children?: ReactNode;
}) {
  const router = useRouter();
  const isNew = !initial.id;
  const [brands, setBrands] = useState(brandList);
  const [v, setV] = useState(() => Object.fromEntries(Object.entries(initial.vehicle).map(([k, x]) => [k, typeof x === 'boolean' ? x : str(x)])) as Record<string, string | boolean>);
  const [t, setT] = useState(initial.translations);
  const [specs, setSpecs] = useState<Spec[]>(initial.specs);
  const [lang, setLang] = useState<EditorLocale>('en');
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ error?: string; done?: string } | null>(null);
  const [pending, start] = useTransition();
  const [newBrand, setNewBrand] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set =(k: string, value: string | boolean) => {
    setDirty(true); setMessage(null);
    setV(prev => {
      const next = { ...prev, [k]: value };
      if (!slugTouched && (k === 'brand_id' || k === 'model' || k === 'variant' || k === 'model_year')) {
        next.slug = slugify(brands.find(b => b.id === next.brand_id)?.name, str(next.model), str(next.variant), str(next.model_year));
      }
      return next;
    });
  };
  const setText = (f: TextField, value: string) => { setDirty(true); setMessage(null); setT(prev => ({ ...prev, [lang]: { ...prev[lang], [f]: value } })); };
  const setSpec = (i: number, part: 'label' | 'value', value: string) => {
    setDirty(true); setMessage(null);
    setSpecs(prev => prev.map((s, n) => (n === i ? { ...s, [lang]: { label: s[lang]?.label ?? '', value: s[lang]?.value ?? '', [part]: value } } : s)));
  };
  const moveSpec = (i: number, d: -1 | 1) => { setDirty(true); setSpecs(prev => { const a = [...prev]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; }); };

  /* leaving with unsaved changes asks first */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  const payload = useMemo((): EditorPayload => ({
    id: initial.id,
    vehicle: {
      slug: str(v.slug), brand_id: str(v.brand_id), model: str(v.model), variant: str(v.variant), body_type: str(v.body_type) as EditorPayload['vehicle']['body_type'],
      model_year: str(v.model_year), mileage_km: str(v.mileage_km), exterior_color: str(v.exterior_color), interior_color: str(v.interior_color),
      previous_owners: str(v.previous_owners), vin: str(v.vin), price: str(v.price), currency: str(v.currency) as 'USD',
      status: str(v.status) as 'available', publication: str(v.publication) as 'draft', is_featured: !!v.is_featured,
      featured_rank: v.is_featured ? str(v.featured_rank) || '1' : '', is_sample: !!v.is_sample, photo_credit: str(v.photo_credit),
    },
    translations: t,
    specs,
  }), [v, t, specs, initial.id]);

  const save = () => start(async () => {
    setMessage(null);
    const r = await saveVehicle(payload);
    if (!r.ok) { setMessage({ error: r.error }); return; }
    setDirty(false);
    if (isNew) { router.replace(`/admin/inventory/${r.id}?saved=1`); return; }
    setMessage({ done: 'Saved. The website shows the change now.' });
    router.refresh();
  });

  const addBrand = () => start(async () => {
    const r = await createBrand(newBrand ?? '');
    if (!r.ok) { setMessage({ error: r.error }); return; }
    setBrands(prev => [...prev, r.brand].sort((a, b) => a.name.localeCompare(b.name)));
    setNewBrand(null);
    set('brand_id', r.brand.id);
  });

  const duplicate = () => start(async () => {
    const r = await duplicateVehicle(initial.id!);
    if (!r.ok) { setMessage({ error: r.error }); return; }
    router.push(`/admin/inventory/${r.id}?copied=1`);
  });

  const remove = () => start(async () => {
    const r = await deleteVehicle(initial.id!);
    if (!r.ok) { setMessage({ error: r.error }); setConfirmDelete(false); return; }
    setDirty(false);
    router.replace('/admin/inventory?deleted=1');
  });

  const rtl = lang === 'ar';
  const panel = 'rounded-3xl bg-panel px-[clamp(20px,4vw,36px)] py-[clamp(22px,4vw,32px)] shadow-[inset_0_0_0_1px_var(--line)]';
  const input = (k: string, props: Record<string, unknown> = {}) => (
    <input name={k} value={str(v[k])} onChange={e => set(k, e.target.value)} {...props} />
  );

  return (
    <div className={'mt-8 [display:grid] gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start' + (canEdit && dirty ? ' pb-20 xl:pb-0' : '')}>
      <fieldset disabled={!canEdit || pending} className="m-0 min-w-0 border-0 p-0 [display:grid] gap-6">
        <legend className="sr-only">The car</legend>
        {initial.legacy && (
          <p className="m-0 rounded-2xl px-5 py-3 text-[15px] text-champagne-hi shadow-[inset_0_0_0_1px_var(--line-strong)]">
            This car also lives in the current website’s admin page. Until the switch to the new website, changes made there to its
            details, photos or specs replace the ones made here.
          </p>
        )}

        <section className={panel} aria-labelledby="basics">
          <h2 id="basics" className="mb-6 text-[clamp(24px,2.6vw,30px)]">The car</h2>
          <div className="[display:grid] gap-x-7 gap-y-6 md:grid-cols-2">
            <Field label="Brand">
              {newBrand === null ? (
                <select name="brand_id" className={selectClass} value={str(v.brand_id)} onChange={e => (e.target.value === '+' ? setNewBrand('') : set('brand_id', e.target.value))}>
                  <option value="" disabled>Choose a brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  {canEdit && <option value="+">Add a brand…</option>}
                </select>
              ) : (
                <span className="flex items-end gap-3">
                  <input aria-label="New brand’s name" value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="e.g. Aston Martin" autoFocus />
                  <button type="button" className={smallBtn} onClick={addBrand} disabled={!newBrand.trim()}>Add</button>
                  <button type="button" className={smallBtn} onClick={() => setNewBrand(null)}>Cancel</button>
                </span>
              )}
            </Field>
            <Field label="Model">{input('model', { required: true, maxLength: 120, placeholder: 'e.g. F8 Tributo' })}</Field>
            <Field label="Version (optional)" hint="e.g. Spider, Competition">{input('variant', { maxLength: 120 })}</Field>
            <Field label="Body type">
              <select name="body_type" className={selectClass} value={str(v.body_type)} onChange={e => set('body_type', e.target.value)}>
                <option value="" disabled>Choose</option>
                {BODY_TYPE_KEYS.map(k => <option key={k} value={k}>{BODY_TYPES[k]}</option>)}
              </select>
            </Field>
            <Field label="Year">{input('model_year', { inputMode: 'numeric', maxLength: 4 })}</Field>
            <Field label="Mileage (km)">{input('mileage_km', { inputMode: 'numeric' })}</Field>
            <Field label="Exterior colour">{input('exterior_color', { maxLength: 80 })}</Field>
            <Field label="Interior colour">{input('interior_color', { maxLength: 80 })}</Field>
            <Field label="Previous owners">{input('previous_owners', { inputMode: 'numeric', maxLength: 2 })}</Field>
            <Field label="VIN (optional)" hint="17 letters and digits. Never shown on the website.">{input('vin', { maxLength: 17, autoCapitalize: 'characters', spellCheck: false })}</Field>
            <Field label="Price" hint="Leave empty to show “Price on request”.">
              <span className="flex items-end gap-3">
                {input('price', { inputMode: 'decimal' })}
                <select name="currency" aria-label="Currency" className={selectClass + ' w-24'} value={str(v.currency)} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </span>
            </Field>
            <Field label="Photo credit (optional)" hint="Shown under the photos, e.g. a photographer’s name.">{input('photo_credit', { maxLength: 200 })}</Field>
            <div className="md:col-span-2">
              <Field label="Address on the website" hint={!isNew && initial.publishedAddress ? 'Changing it breaks links already shared to this car.' : 'Made from the brand, model and year; you can change it.'}>
                <span className="flex items-end gap-1 text-[15px] text-muted">
                  <span className="whitespace-nowrap pb-[13px]">/car/</span>
                  <input name="slug" value={str(v.slug)} onChange={e => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }} maxLength={100} spellCheck={false} />
                </span>
              </Field>
            </div>
          </div>
        </section>

        <section className={panel} aria-labelledby="text">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="text" className="text-[clamp(24px,2.6vw,30px)]">The words</h2>
            <LanguageTabs lang={lang} setLang={setLang} filled={l => TEXT_FIELDS.some(f => t[l][f].trim())} />
          </div>
          {lang !== 'en' && <p className="mb-6 text-[14px] text-muted">Anything left empty in {LOCALE_LABEL[lang]} shows the English instead. The French and Arabic pages open with Phase 8.</p>}
          <div className="[display:grid] gap-6" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
            {TEXT_FIELDS.map(f => (
              <Field key={f} label={FIELD_LABEL[f]} hint={FIELD_HINT[f]} count={`${t[lang][f].length} / ${TEXT_LIMIT[f]}`}>
                {f === 'description' || f === 'service_records' || f === 'import_papers'
                  ? <textarea name={`${lang}-${f}`} value={t[lang][f]} onChange={e => setText(f, e.target.value)} maxLength={TEXT_LIMIT[f]} rows={f === 'description' ? 7 : 3} className={textareaClass} />
                  : <input name={`${lang}-${f}`} value={t[lang][f]} onChange={e => setText(f, e.target.value)} maxLength={TEXT_LIMIT[f]} />}
              </Field>
            ))}
          </div>
        </section>

        <section className={panel} aria-labelledby="specs">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="specs" className="text-[clamp(24px,2.6vw,30px)]">Specs</h2>
            <LanguageTabs lang={lang} setLang={setLang} filled={l => specs.some(s => s[l]?.label)} />
          </div>
          {specs.length === 0 && <p className="mb-4 text-muted">No specs yet. Engine, power, gearbox and the like show as a list on the car’s page.</p>}
          <ol className="m-0 list-none p-0 [display:grid] gap-4" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
            {specs.map((s, i) => (
              <li key={i} className="[display:grid] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <label className="block"><span className="label">Spec {i + 1}</span>
                  <input value={s[lang]?.label ?? ''} onChange={e => setSpec(i, 'label', e.target.value)} maxLength={80} placeholder={lang === 'en' ? 'e.g. Engine' : s.en?.label ?? ''} /></label>
                <label className="block"><span className="label">Value</span>
                  <input value={s[lang]?.value ?? ''} onChange={e => setSpec(i, 'value', e.target.value)} maxLength={200} placeholder={lang === 'en' ? 'e.g. 3.9 L twin-turbo V8' : s.en?.value ?? ''} /></label>
                <span className="flex gap-2" dir="ltr">
                  <button type="button" className={smallBtn + ' px-3'} aria-label={`Move spec ${i + 1} up`} disabled={i === 0} onClick={() => moveSpec(i, -1)}>↑</button>
                  <button type="button" className={smallBtn + ' px-3'} aria-label={`Move spec ${i + 1} down`} disabled={i === specs.length - 1} onClick={() => moveSpec(i, 1)}>↓</button>
                  <button type="button" className={smallBtn + ' px-3'} aria-label={`Remove spec ${i + 1}`} onClick={() => { setDirty(true); setSpecs(prev => prev.filter((_, n) => n !== i)); }}>✕</button>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className={smallBtn + ' mt-6'} onClick={() => { setDirty(true); setSpecs(prev => [...prev, {}]); }}>Add a spec</button>
          {lang !== 'en' && specs.length > 0 && <p className="mt-4 text-[14px] text-muted">The grey text is the English, shown where this language has none yet.</p>}
        </section>

        {children}
      </fieldset>

      <aside className="[display:grid] gap-6 xl:sticky xl:top-8">
        <fieldset disabled={!canEdit || pending} className={panel + ' m-0 min-w-0 border-0'}>
          <legend className="sr-only">On the website</legend>
          <h2 className="mb-5 text-[clamp(24px,2.6vw,30px)]">On the website</h2>
          <Choice name="publication" label="Shown" value={str(v.publication)} set={x => set('publication', x)}
            options={Object.entries(PUBLICATION_LABEL)} hint={{ draft: 'Only the team sees it.', published: 'Everyone sees it.', archived: 'Kept for the records, hidden.' }} />
          <Choice name="status" label="Status" value={str(v.status)} set={x => set('status', x)} disabled={!canSell}
            options={Object.entries(STATUS_LABEL)} hint={{ available: 'For sale.', reserved: 'Shown with a “Reserved” tag.', sold: 'Taken off the website.' }} />
          {!canSell && <p className="mt-1 mb-4 text-[13px] text-muted">Only a manager or the owner can reserve or sell a car.</p>}
          <label className="mt-5 flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 min-h-0 accent-[var(--champagne)]" checked={!!v.is_featured} onChange={e => set('is_featured', e.target.checked)} />
            <span><span className="text-ink">Featured on the home page</span><span className="block text-[13px] text-muted">The home page shows the first three featured cars on show.</span></span>
          </label>
          {v.is_featured && (
            <label className="mt-4 block ps-8"><span className="label block">Position</span>
              <input name="featured_rank" inputMode="numeric" value={str(v.featured_rank) || '1'} onChange={e => set('featured_rank', e.target.value)} maxLength={2} className="max-w-24" />
              <span className="mt-1.5 block text-[13px] text-muted">A position already taken moves the cars from there on down one.</span></label>
          )}
          {featured.some(f => f.id !== initial.id) && (
            <div className="mt-4 ps-8 text-[13px] text-muted">
              <p className="m-0">Featured now:</p>
              <ol className="m-0 mt-1 list-none p-0">
                {featured.filter(f => f.id !== initial.id).map(f => <li key={f.id}>{f.rank ?? '–'} · {f.name}{f.shown ? '' : ' (not on show)'}</li>)}
              </ol>
            </div>
          )}
          <label className="mt-5 flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 min-h-0 accent-[var(--champagne)]" checked={!!v.is_sample} onChange={e => set('is_sample', e.target.checked)} />
            <span><span className="text-ink">Sample listing</span><span className="block text-[13px] text-muted">Shown with a “Sample” tag: stock photos, not a real car for sale.</span></span>
          </label>
        </fieldset>

        {canEdit && (
          <div className={panel + ' [display:grid] gap-3'}>
            {message?.error && <p role="alert" className="m-0 rounded-2xl bg-[rgba(200,32,42,.12)] px-4 py-3 text-[15px] shadow-[inset_0_0_0_1px_rgba(200,32,42,.55)]">{message.error}</p>}
            {message?.done && <p role="status" className="m-0 text-[15px] text-champagne-hi">{message.done}</p>}
            <button type="button" className="btn w-full mt-0" onClick={save} aria-disabled={pending} disabled={pending}>
              {pending ? 'Saving…' : isNew ? 'Create the car' : 'Save changes'}
            </button>
            {dirty && !pending && <p className="m-0 text-center text-[13px] text-muted">Unsaved changes</p>}
            {initial.publishedAddress && <a href={initial.publishedAddress} target="_blank" rel="noopener" className="text-center text-[14px] text-champagne no-underline hover:underline">See it on the website ↗</a>}
          </div>
        )}

        {!isNew && canEdit && (
          <div className={panel + ' [display:grid] gap-3'}>
            <button type="button" className={smallBtn + ' w-full'} onClick={duplicate} disabled={pending || dirty} title={dirty ? 'Save your changes first' : undefined}>Duplicate as a new draft</button>
            {canDelete && (confirmDelete ? (
              <div role="group" aria-label="Confirm deleting" className="[display:grid] gap-2">
                <p className="m-0 text-[14px]">Delete this car, its photos and videos for good? Archiving keeps it for the records instead.</p>
                <span className="flex gap-2">
                  <button type="button" className={smallBtn + ' flex-1 shadow-[inset_0_0_0_1px_rgba(200,32,42,.7)]'} onClick={remove} disabled={pending}>Delete for good</button>
                  <button type="button" className={smallBtn + ' flex-1'} onClick={() => setConfirmDelete(false)}>Keep it</button>
                </span>
              </div>
            ) : (
              <button type="button" className={smallBtn + ' w-full'} onClick={() => setConfirmDelete(true)}>Delete…</button>
            ))}
          </div>
        )}
      </aside>

      {/* phones and tablets: the save button is at the end of a long page, so unsaved changes also bring a bar */}
      {canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-line bg-[rgba(11,13,20,.96)] px-[var(--gutter)] py-3 xl:hidden">
          <span className="text-[13px] text-muted">{pending ? 'Saving…' : 'Unsaved changes'}</span>
          <button type="button" className="btn mt-0 min-h-11 w-auto px-6 text-[11px] after:hidden" onClick={save} disabled={pending}>{isNew ? 'Create the car' : 'Save changes'}</button>
        </div>
      )}
    </div>
  );
}

const textareaClass = 'block w-full resize-y border-0 border-b border-line-strong bg-transparent py-3 font-body text-[17px] font-light leading-relaxed text-ink focus:border-champagne-hi focus:outline-none';

function Field({ label, hint, count, children }: { label: string; hint?: string; count?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="flex justify-between gap-4"><span className="label">{label}</span>{count && <span className="text-[12px] text-muted" dir="ltr">{count}</span>}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

function LanguageTabs({ lang, setLang, filled }: { lang: EditorLocale; setLang: (l: EditorLocale) => void; filled: (l: EditorLocale) => boolean }) {
  return (
    <div role="tablist" aria-label="Language" className="flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_var(--line)]">
      {LOCALES.map(l => (
        <button key={l} type="button" role="tab" aria-selected={l === lang} onClick={() => setLang(l)}
          className={'cursor-pointer rounded-full border-0 px-4 py-1.5 font-body text-[13px] ' + (l === lang ? 'bg-panel-2 text-champagne-hi shadow-[inset_0_0_0_1px_var(--line-strong)]' : 'bg-transparent text-muted hover:text-ink')}>
          {LOCALE_LABEL[l]}{!filled(l) && l !== 'en' ? <span className="sr-only"> (empty)</span> : null}{filled(l) && l !== 'en' ? ' ·' : ''}
        </button>
      ))}
    </div>
  );
}

function Choice({ name, label, value, set, options, hint, disabled }: {
  name: string; label: string; value: string; set: (v: string) => void; options: [string, string][]; hint: Record<string, string>; disabled?: boolean;
}) {
  return (
    <fieldset className="m-0 mb-4 border-0 p-0" disabled={disabled}>
      <legend className="label mb-2">{label}</legend>
      <div className="[display:grid] gap-2">
        {options.map(([k, text]) => (
          <label key={k} className={'flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ' + (value === k ? 'bg-panel-2 shadow-[inset_0_0_0_1px_var(--line-strong)]' : 'shadow-[inset_0_0_0_1px_var(--line)]') + (disabled ? ' cursor-default opacity-70' : '')}>
            <input type="radio" name={name} value={k} checked={value === k} onChange={() => set(k)} className="mt-1 h-4 w-4 min-h-0 accent-[var(--champagne)]" />
            <span><span className="text-ink">{text}</span><span className="block text-[13px] text-muted">{hint[k]}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
