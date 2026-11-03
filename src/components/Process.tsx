import { asset } from '../data/images';
import { vars } from './ui';

const STEPS = [
  { img: 'step-1', alt: 'A black SUV in a dark tunnel with its lights on', title: 'Tell us what you want.', text: 'The car, the color, the budget. Or just the feeling.' },
  { img: 'step-2', alt: 'A red leather sports car interior', title: 'See the car and its papers.', text: 'Together, side by side, before anyone talks about price.' },
  { img: 'step-3', alt: 'An exposed chassis and engine', title: 'Bring your own mechanic.', text: 'Have the car checked by someone you trust.' }
];

/* "Three steps. No guessing." */
export default function Process() {
  return (
    <section className="how reveal" id="how">
      <h2 className="rv">Three steps. No guessing.</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.img} className="step rv" style={vars({ '--i': i + 1 })}>
            <img src={asset(`assets/${s.img}.webp`)} srcSet={`${asset(`assets/${s.img}-800.webp`)} 800w, ${asset(`assets/${s.img}.webp`)} 960w`} sizes="(max-width:900px) 100vw, 33vw" width={960} height={720} decoding="async" alt={s.alt} loading="lazy" />
            <span className="label">Step {i + 1}</span><h3>{s.title}</h3><p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
