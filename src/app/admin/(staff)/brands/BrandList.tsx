'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { smallBtn } from '@/components/admin/forms';
import { LOCALE_LABEL, LOCALES, type EditorLocale } from '@/lib/vehicle-form';
import { createBrand, deleteBrand, moveBrand, saveBrand } from './actions';

type Brand = { id: string; name: string; slug: string; isPublished: boolean; description: Record<EditorLocale, string>; cars: number; onSite: number };

export default function BrandList({ brands, canDelete }: { brands: Brand[]; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ error?: string; done?: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (f: () => Promise<{ ok: boolean; error?: string }>, done?: string) => start(async () => {
    setMessage(null);
    const r = await f();
    if (!r.ok) setMessage({ error: r.error }); else { if (done) setMessage({ done }); router.refresh(); }
  });

  return (
    <>
      <form className="mt-8 flex flex-wrap items-end gap-4" onSubmit={e => { e.preventDefault(); run(async () => { const r = await createBrand(name); if (r.ok) setName(''); return r; }, 'Brand added.'); }}>
        <label className="block min-w-[240px] flex-1 sm:max-w-[360px]"><span className="label">New brand</span><input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="e.g. Aston Martin" /></label>
        <button type="submit" className={smallBtn} disabled={pending || !name.trim()}>Add the brand</button>
      </form>
      <div aria-live="polite" className="mt-4">
        {message?.error && <p role="alert" className="m-0 text-ink">{message.error}</p>}
        {message?.done && <p className="m-0 text-champagne-hi">{message.done}</p>}
      </div>
      <ol className="m-0 mt-6 list-none divide-y divide-line p-0 shadow-[0_-1px_0_var(--line),0_1px_0_var(--line)]">
        {brands.map((b, i) => (
          <li key={b.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="m-0 text-[18px] text-ink">{b.name}{!b.isPublished && <span className="text-muted"> · hidden</span>}</p>
                <p className="m-0 mt-1 text-[14px] text-muted">{b.cars === 0 ? 'No cars' : `${b.cars} ${b.cars === 1 ? 'car' : 'cars'}, ${b.onSite} on the website`}{b.onSite > 0 && b.isPublished ? <> · <a className="text-champagne no-underline hover:underline" href={`/brands/${b.slug}`} target="_blank" rel="noopener">its page ↗</a></> : null}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={smallBtn + ' px-3'} aria-label={`Move ${b.name} up`} disabled={pending || i === 0} onClick={() => run(() => moveBrand(b.id, 'up'))}>↑</button>
                <button type="button" className={smallBtn + ' px-3'} aria-label={`Move ${b.name} down`} disabled={pending || i === brands.length - 1} onClick={() => run(() => moveBrand(b.id, 'down'))}>↓</button>
                <button type="button" className={smallBtn} aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? 'Close' : 'Edit'}</button>
              </div>
            </div>
            {open === b.id && <BrandForm brand={b} canDelete={canDelete} pending={pending} run={run} />}
          </li>
        ))}
      </ol>
    </>
  );
}

function BrandForm({ brand, canDelete, pending, run }: { brand: Brand; canDelete: boolean; pending: boolean; run: (f: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void }) {
  const [name, setName] = useState(brand.name);
  const [published, setPublished] = useState(brand.isPublished);
  const [description, setDescription] = useState(brand.description);
  const [lang, setLang] = useState<EditorLocale>('en');
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mt-5 [display:grid] gap-5 rounded-2xl bg-panel px-5 py-5 shadow-[inset_0_0_0_1px_var(--line)]">
      <label className="block"><span className="label">Name</span><input value={name} onChange={e => setName(e.target.value)} maxLength={80} /></label>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span className="label">Words on its page</span>
          <div role="tablist" aria-label="Language" className="flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_var(--line)]">
            {LOCALES.map(l => (
              <button key={l} type="button" role="tab" aria-selected={l === lang} onClick={() => setLang(l)}
                className={'cursor-pointer rounded-full border-0 px-4 py-1.5 font-body text-[13px] ' + (l === lang ? 'bg-panel-2 text-champagne-hi' : 'bg-transparent text-muted hover:text-ink')}>{LOCALE_LABEL[l]}</button>
            ))}
          </div>
        </div>
        <textarea aria-label={`Words on its page (${LOCALE_LABEL[lang]})`} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} rows={4} maxLength={2000} value={description[lang]}
          onChange={e => setDescription({ ...description, [lang]: e.target.value })}
          className="block w-full resize-y border-0 border-b border-line-strong bg-transparent py-3 font-body text-[17px] font-light text-ink focus:border-champagne-hi focus:outline-none" />
      </div>
      <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 min-h-0 accent-[var(--champagne)]" checked={published} onChange={e => setPublished(e.target.checked)} />
        <span>Show this brand on the website</span></label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={smallBtn} disabled={pending} onClick={() => run(() => saveBrand({ id: brand.id, name, description, is_published: published }), 'Saved.')}>Save</button>
        {canDelete && (brand.cars > 0
          ? <span className="self-center text-[13px] text-muted">A brand with cars can’t be deleted.</span>
          : confirm
            ? <><button type="button" className={smallBtn + ' shadow-[inset_0_0_0_1px_rgba(200,32,42,.7)]'} disabled={pending} onClick={() => run(() => deleteBrand(brand.id), 'Brand deleted.')}>Delete for good</button>
                <button type="button" className={smallBtn} onClick={() => setConfirm(false)}>Keep it</button></>
            : <button type="button" className={smallBtn} onClick={() => setConfirm(true)}>Delete…</button>)}
      </div>
    </div>
  );
}
