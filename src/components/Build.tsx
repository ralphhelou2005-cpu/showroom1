import { useEffect, useRef } from 'react';
import { startBuild } from '../lib/build';
import { asset } from '../data/images';
import { vars } from './ui';

const set = (name: string, big: number) => `${asset(`assets/${name}-800.webp`)} 800w, ${asset(`assets/${name}.webp`)} ${big}w`;
const STILLS = [['stage-1', '0', 'A bare carbon frame on workshop stands'], ['stage-2', '.25', ''], ['stage-3', '.5', ''], ['stage-4', '.75', ''], ['stage-5', '1', '']];
const COLORS = [['red', 'Race Red', '#C4161C'], ['blue', 'Deep Blue', '#123F63'], ['silver', 'Silver', '#B9BAC0'], ['black', 'Black', '#101014']];
const PARTS = ['Carbon frame', 'Engine', 'Wheels and brakes', 'Bodywork', 'Paint'];

/* "See what's under the paint": the hold-to-build tool with the colour picker (driven by src/lib/build.ts) */
export default function Build() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => startBuild(root.current!), []);
  return (
    <section className="build" id="build" aria-labelledby="buildTitle" ref={root}>
      <div className="build-head reveal">
        <h2 id="buildTitle" className="rv">See what's under the paint.</h2>
        <p className="label rv" style={vars({ '--i': 1 })}>Hold the button. Let go and it eases back.</p>
      </div>
      <div className="bay" id="bay">
        {STILLS.map(([name, at, alt], i) => (
          <img key={name} className={'still' + (i === 0 ? ' on' : '')} data-at={at} src={asset(`assets/${name}.webp`)} srcSet={set(name, 1440)} sizes="100vw" width={1440} height={804} decoding="async" alt={alt} loading="lazy" />
        ))}
        <video id="buildVid" preload="none" muted playsInline aria-hidden="true" tabIndex={-1} />
        {COLORS.map(([c]) => (
          <img key={c} className="paint" data-color={c} src={asset(`assets/color-${c}.webp`)} srcSet={set('color-' + c, 1600)} sizes="100vw" width={1600} height={893} decoding="async" alt="" loading="lazy" />
        ))}
        <ol className="parts" id="parts" aria-hidden="true">
          {PARTS.map((p, i) => <li key={p} className={i === 0 ? 'on' : undefined}><i />{p}</li>)}
        </ol>
        <p className="concept label">Illustration only.<br />Not for sale.</p>
      </div>
      <div className="controls" id="controls">
        <button className="hold" id="hold" type="button" aria-label="Hold to build" aria-describedby="holdState"><svg viewBox="0 0 104 104" aria-hidden="true"><circle className="track" cx="52" cy="52" r="48" /><circle className="prog" cx="52" cy="52" r="48" pathLength={1} /></svg><span>Hold</span></button>
        <div className="hold-text"><span className="hold-copy">Hold to build</span><span className="label" id="holdState" role="status">Stage 1 of 5: Carbon frame</span></div>
        <div className="picker">
          <h3>Now pick your color.</h3>
          <div className="swatches" role="group" aria-label="Paint color">
            {COLORS.map(([c, label, hex], i) => (
              <button key={c} className="swatch" type="button" data-pick={c} aria-pressed={i === 0 ? 'true' : 'false'} style={vars({ '--c': hex })}><span />{label}</button>
            ))}
          </div>
          <button className="again" id="again" type="button">Build it again</button>
        </div>
      </div>
    </section>
  );
}
