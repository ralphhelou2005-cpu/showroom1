import { getWords } from '@/i18n/server-words';
import { asset } from '@/lib/media';
import BuildEngine from './BuildEngine';
import { vars } from './ui';

const set = (name: string, big: number) => `${asset(`assets/${name}-800.webp`)} 800w, ${asset(`assets/${name}.webp`)} ${big}w`;
const STILLS = [['stage-1', '0'], ['stage-2', '.25'], ['stage-3', '.5'], ['stage-4', '.75'], ['stage-5', '1']];
const COLORS = [['red', '#C4161C'], ['blue', '#123F63'], ['silver', '#B9BAC0'], ['black', '#101014']];

/* "See what's under the paint": the hold-to-build tool with the colour picker (driven by src/lib/build.ts, which
   reads the stage words from data-stage and data-done) */
export default async function Build() {
  const { w: { build: t } } = await getWords();
  return (
    <section className="build" id="build" aria-labelledby="buildTitle" data-stage={t.stage} data-done={t.done} data-parts={t.parts.join('|')}>
      <BuildEngine />
      <div className="build-head reveal">
        <h2 id="buildTitle" className="rv">{t.title}</h2>
        <p className="label rv" style={vars({ '--i': 1 })}>{t.how}</p>
      </div>
      <div className="bay" id="bay">
        {STILLS.map(([name, at], i) => (
          <img key={name} className={'still' + (i === 0 ? ' on' : '')} data-at={at} src={asset(`assets/${name}.webp`)} srcSet={set(name, 1440)} sizes="100vw" width={1440} height={804} decoding="async" alt={i === 0 ? t.frameAlt : ''} loading="lazy" />
        ))}
        <video id="buildVid" preload="none" muted playsInline aria-hidden="true" tabIndex={-1} />
        {COLORS.map(([c]) => (
          <img key={c} className="paint" data-color={c} src={asset(`assets/color-${c}.webp`)} srcSet={set('color-' + c, 1600)} sizes="100vw" width={1600} height={893} decoding="async" alt="" loading="lazy" />
        ))}
        <ol className="parts" id="parts" aria-hidden="true">
          {t.parts.map((p, i) => <li key={p} className={i === 0 ? 'on' : undefined}><i />{p}</li>)}
        </ol>
        <p className="concept label">{t.concept[0]}<br />{t.concept[1]}</p>
      </div>
      <div className="controls" id="controls">
        <button className="hold" id="hold" type="button" aria-label={t.holdLabel} aria-describedby="holdState"><svg viewBox="0 0 104 104" aria-hidden="true"><circle className="track" cx="52" cy="52" r="48" /><circle className="prog" cx="52" cy="52" r="48" pathLength={1} /></svg><span>{t.hold}</span></button>
        <div className="hold-text"><span className="hold-copy">{t.holdLabel}</span><span className="label" id="holdState" role="status">{t.stage.replace('{n}', '1').replace('{part}', t.parts[0])}</span></div>
        <div className="picker">
          <h3>{t.pick}</h3>
          <div className="swatches" role="group" aria-label={t.paint}>
            {COLORS.map(([c, hex], i) => (
              <button key={c} className="swatch" type="button" data-pick={c} aria-pressed={i === 0 ? 'true' : 'false'} style={vars({ '--c': hex })}><span />{t.colors[i]}</button>
            ))}
          </div>
          <button className="again" id="again" type="button">{t.again}</button>
        </div>
      </div>
    </section>
  );
}
