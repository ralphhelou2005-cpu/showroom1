'use client';
import { useRef, useState, useTransition } from 'react';
import { smallBtn } from '@/components/admin/forms';
import type { MediaItem } from '@/lib/inventory';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { IMAGE_TYPES, prepareImage, prepareVideo, VIDEO_TYPES, type Prepared } from '@/lib/upload';
import { LOCALE_LABEL, LOCALES, type EditorLocale } from '@/lib/vehicle-form';
import { addMedia, deleteMedia, discardUploads, reorderMedia, saveMediaAlt } from './actions';

/* A car's photos and videos: add them (prepared in the browser, then uploaded straight to the media bucket as the
   person, so its rules apply), describe them in each language, put them in order (the first photo is the main
   picture everywhere), and remove them. */
export default function MediaManager({ vehicleId, initial, canEdit }: { vehicleId: string; initial: MediaItem[]; canEdit: boolean }) {
  const [media, setMedia] = useState(initial);
  const [lang, setLang] = useState<EditorLocale>('en');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  async function add(files: File[]) {
    if (!files.length || busy) return;
    setError(null); setSaved(null);
    const folder = `vehicles/${vehicleId}`;
    const supabase = supabaseBrowser();
    const done: Prepared[] = [], uploaded: string[] = [], problems: string[] = [];
    for (const [n, file] of files.entries()) {
      const video = file.type.startsWith('video/');
      setBusy(`${video ? 'Preparing the video' : 'Preparing the photo'} ${files.length > 1 ? `${n + 1} of ${files.length}` : ''}…`);
      try {
        const p = video ? await prepareVideo(file, folder) : await prepareImage(file, folder);
        setBusy(video ? `Uploading the video${files.length > 1 ? ` (${n + 1} of ${files.length})` : ''}. A large one can take a few minutes…` : `Uploading ${files.length > 1 ? `${n + 1} of ${files.length}` : 'the photo'}…`);
        for (const f of p.files) {
          const { error: e } = await supabase.storage.from('media').upload(f.path, f.blob, { contentType: f.type, cacheControl: '31536000', upsert: false });
          if (e) throw new Error(`${file.name}: ${/row-level security|Unauthorized/i.test(e.message) ? 'your role can’t upload' : /size/i.test(e.message) ? 'the file is too large' : 'the upload didn’t work'}.`);
          uploaded.push(f.path);
        }
        done.push(p);
      } catch (e) {
        problems.push((e as Error).message);
      }
    }
    if (done.length) {
      setBusy('Saving…');
      const r = await addMedia(vehicleId, done.map(p => ({ kind: p.kind, path: p.path, posterPath: p.posterPath, width: p.width, height: p.height, duration: p.duration })));
      if (r.ok) { setMedia(prev => [...prev, ...r.media]); setSaved(`${done.length === 1 ? 'Added' : `${done.length} added`}. The website shows ${done.length === 1 ? 'it' : 'them'} now.`); }
      else { problems.push(r.error); await discardUploads(vehicleId, uploaded); }
    }
    setBusy(null);
    if (problems.length) setError(problems.join(' '));
    if (fileInput.current) fileInput.current.value = '';
  }

  const move = (i: number, to: number) => {
    const next = [...media];
    const [item] = next.splice(i, 1);
    next.splice(to, 0, item);
    const before = media;
    setMedia(next); setError(null); setSaved(null);
    start(async () => {
      const r = await reorderMedia(vehicleId, next.map(m => m.id));
      if (!r.ok) { setMedia(before); setError(r.error); } else setSaved('Order saved.');
    });
  };

  const remove = (id: string) => {
    setConfirm(null); setError(null); setSaved(null);
    start(async () => {
      const r = await deleteMedia(id);
      if (!r.ok) { setError(r.error); return; }
      setMedia(prev => prev.filter(m => m.id !== id));
      setSaved('Removed.');
    });
  };

  const describe = (m: MediaItem, text: string) => setMedia(prev => prev.map(x => (x.id === m.id ? { ...x, alt: { ...x.alt, [lang]: text } } : x)));
  const saveAlt = (m: MediaItem) => start(async () => {
    const r = await saveMediaAlt(m.id, m.alt as Record<string, string>);
    if (!r.ok) setError(r.error); else setSaved('Description saved.');
  });

  const firstImage = media.findIndex(m => m.kind === 'image');
  return (
    <section className="rounded-3xl bg-panel px-[clamp(20px,4vw,36px)] py-[clamp(22px,4vw,32px)] shadow-[inset_0_0_0_1px_var(--line)]" aria-labelledby="media">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="media" className="text-[clamp(24px,2.6vw,30px)]">Photos and videos</h2>
        {media.length > 0 && (
          <div role="tablist" aria-label="Language of the descriptions" className="flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_var(--line)]">
            {LOCALES.map(l => (
              <button key={l} type="button" role="tab" aria-selected={l === lang} onClick={() => setLang(l)}
                className={'cursor-pointer rounded-full border-0 px-4 py-1.5 font-body text-[13px] ' + (l === lang ? 'bg-panel-2 text-champagne-hi shadow-[inset_0_0_0_1px_var(--line-strong)]' : 'bg-transparent text-muted hover:text-ink')}>{LOCALE_LABEL[l]}</button>
            ))}
          </div>
        )}
      </div>
      <p className="mb-6 text-[15px] text-muted">The first photo is the main picture on the website. Photos are resized to the website’s sizes before they upload; videos up to 50 MB.</p>

      {canEdit && (
        <div
          onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); add([...e.dataTransfer.files]); }}
          className={'mb-6 rounded-2xl px-6 py-8 text-center transition-colors ' + (over ? 'bg-panel-2 shadow-[inset_0_0_0_1px_var(--champagne)]' : 'shadow-[inset_0_0_0_1px_var(--line-strong)] [border-style:dashed]')}>
          <input ref={fileInput} id={`upload-${vehicleId}`} type="file" multiple accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} className="sr-only"
            onChange={e => add([...(e.target.files ?? [])])} disabled={!!busy} />
          <label htmlFor={`upload-${vehicleId}`} className={smallBtn + ' cursor-pointer'} aria-disabled={!!busy}>Choose photos or videos</label>
          <p className="mt-3 mb-0 text-[14px] text-muted">or drop them here</p>
        </div>
      )}
      <div aria-live="polite" className="[display:grid] gap-3">
        {busy && <p role="status" className="m-0 text-[15px] text-champagne-hi">{busy}</p>}
        {error && <p role="alert" className="m-0 rounded-2xl bg-[rgba(200,32,42,.12)] px-4 py-3 text-[15px] shadow-[inset_0_0_0_1px_rgba(200,32,42,.55)]">{error}</p>}
        {saved && !busy && <p className="m-0 text-[15px] text-champagne-hi">{saved}</p>}
      </div>

      {media.length === 0 ? (
        <p className="mt-4 mb-0 text-muted">No photos yet. Until it has one, the car shows without a picture.</p>
      ) : (
        <ol className="m-0 mt-4 list-none p-0 [display:grid] gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {media.map((m, i) => (
            <li key={m.id} className="min-w-0 overflow-hidden rounded-2xl bg-panel-2 shadow-[inset_0_0_0_1px_var(--line)]">
              <div className="relative aspect-[3/2] bg-[#07070b]">
                {m.thumb ? <img src={m.thumb} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <span className="[display:grid] h-full place-items-center text-muted">Video</span>}
                {i === firstImage && <span className="tag">Main picture</span>}
                {m.kind === 'video' && <span className="absolute end-3 bottom-3 rounded-full bg-[rgba(11,13,20,.7)] px-3 py-1 text-[12px] text-ink">▶ Video{m.duration ? ` · ${Math.round(m.duration)} s` : ''}</span>}
                {!m.bucket && <span className="absolute start-3 bottom-3 rounded-full bg-[rgba(11,13,20,.7)] px-3 py-1 text-[12px] text-muted">Ships with the website</span>}
              </div>
              <div className="px-4 pt-3 pb-4">
                <label className="block" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
                  <span className="label">Description ({LOCALE_LABEL[lang]})</span>
                  <input value={m.alt[lang] ?? ''} onChange={e => describe(m, e.target.value)} onBlur={() => saveAlt(m)} maxLength={300} disabled={!canEdit}
                    placeholder={lang === 'en' ? 'e.g. Red Ferrari F8 Tributo, front three-quarter' : m.alt.en ?? ''} className="text-[15px]" />
                </label>
                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={smallBtn + ' px-3'} aria-label={`Move item ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)}>←</button>
                    <button type="button" className={smallBtn + ' px-3'} aria-label={`Move item ${i + 1} later`} disabled={i === media.length - 1} onClick={() => move(i, i + 1)}>→</button>
                    {m.kind === 'image' && i !== firstImage && <button type="button" className={smallBtn + ' px-3'} onClick={() => move(i, 0)}>Make main</button>}
                    {confirm === m.id
                      ? <><button type="button" className={smallBtn + ' px-3 shadow-[inset_0_0_0_1px_rgba(200,32,42,.7)]'} onClick={() => remove(m.id)}>Remove for good</button>
                          <button type="button" className={smallBtn + ' px-3'} onClick={() => setConfirm(null)}>Keep</button></>
                      : <button type="button" className={smallBtn + ' px-3'} onClick={() => setConfirm(m.id)}>Remove…</button>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
