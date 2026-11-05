import { getWords } from '@/i18n/server-words';
import { asset } from '@/lib/media';
import { vars } from './ui';

const IMAGES = ['step-1', 'step-2', 'step-3'];

/* "Three steps. No guessing." */
export default async function Process() {
  const { w: { process: t } } = await getWords();
  const STEPS = t.steps.map((s, i) => ({ ...s, img: IMAGES[i] }));
  return (
    <section className="how reveal" id="how">
      <h2 className="rv">{t.title}</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.img} className="step rv" style={vars({ '--i': i + 1 })}>
            <img src={asset(`assets/${s.img}.webp`)} srcSet={`${asset(`assets/${s.img}-800.webp`)} 800w, ${asset(`assets/${s.img}.webp`)} 960w`} sizes="(max-width:900px) 100vw, 33vw" width={960} height={720} decoding="async" alt={s.alt} loading="lazy" />
            <span className="label">{t.step(i + 1)}</span><h3>{s.title}</h3><p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
