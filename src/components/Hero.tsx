import { asset } from '@/lib/media';
import { vars } from './ui';

/* the same seeded shuffle as before, so the last caption's words arrive in the same rhythm */
function rng(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function Split({ text, seed }: { text: string; seed: number }) {
  const r = rng(seed), words = text.split(' ');
  return (
    <p aria-label={text}>
      {words.map((w, i) => (
        <span className="w" aria-hidden="true" key={i} style={vars({ '--th': (i / words.length * .5 + r() * .05).toFixed(3) })}>{w + (i < words.length - 1 ? ' ' : '')}</span>
      ))}
    </p>
  );
}

export const poster = () => asset('assets/walk/first.webp');
export const posterPhone = () => asset('assets/walk/first-phone.webp');

/* the film's frame as plain HTML: the walk-in engine may start before React takes over the page and swaps the video
   in it when the full-quality film arrives, so React leaves what is inside alone */
const filmHtml = () =>
  `<picture><source media="(max-aspect-ratio: 7/10)" srcset="${posterPhone()}"><img class="poster" id="poster" src="${poster()}" width="1920" height="1080" alt="" fetchpriority="high" decoding="async"></picture>` +
  '<video class="frames" id="frames" muted playsinline preload="none" disablepictureinpicture></video>' +
  '<div class="sweep" id="sweep"></div><i class="lb lb-t"></i><i class="lb lb-b"></i>';

/* The walk-in. This is only the markup: src/lib/home.ts drives it as the page scrolls. */
export default function Hero() {
  return (
    <div id="top" className="hero">
      <div className="stage" id="stage">
        <div className="film-wrap" id="filmWrap" aria-hidden="true" dangerouslySetInnerHTML={{ __html: filmHtml() }} />
        <div className="scrim" aria-hidden="true" />
        <div className="band b1" data-a="0" data-b=".24" style={vars({ opacity: 1, '--k': 1 })}><p>Milcar. Come inside.</p></div>
        <div className="band b2" data-a=".26" data-b=".48"><p>Every car has a story.</p></div>
        <div className="band b3" data-a=".5" data-b=".7"><p><span className="soft" aria-hidden="true">We show you all of it.</span><span className="sharp">We show you all of it.</span></p></div>
        <div className="band b4" data-a=".72" data-b="1"><Split text="Book a private viewing." seed={11} /><a className="btn" href="#book">Book now</a></div>
        <div className="cue label" id="cue" aria-hidden="true">Scroll to walk in</div>
        <svg className="loader" id="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="126" style={{ strokeDashoffset: 'var(--ld,126)' }} /></svg>
      </div>
      <div className="static-hero">
        <div className="static-photo" role="img" aria-label="The Milcar showroom at night, its cars lit behind the glass" />
        <div className="static-copy">
          <h1>Every car has a story. We show you all of it.</h1>
          <p>Milcar Automotive Consultancy. Supercars and luxury cars, with the full history on the table.</p>
          <a className="btn" href="#book">Book a private viewing</a>
        </div>
      </div>
    </div>
  );
}
