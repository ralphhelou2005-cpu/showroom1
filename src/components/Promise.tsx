import { getWords } from '@/i18n/server-words';
import { asset } from '@/lib/media';
import { vars } from './ui';

export default async function PromiseSection() {
  const { w: { promise: t } } = await getWords();
  return (
    <section className="promise reveal" id="promise">
      <figure className="rv"><img src={asset('assets/promise.webp')} srcSet={`${asset('assets/promise-800.webp')} 800w, ${asset('assets/promise.webp')} 1000w`} sizes="(max-width:900px) 100vw, 50vw" width={1000} height={1500} decoding="async" loading="lazy" alt={t.alt} /></figure>
      <div>
        <p className="label rv" style={vars({ '--i': 1 })}>{t.label}</p>
        <h2 className="rv" style={vars({ '--i': 2 })}>{t.title}</h2>
        <ul className="docs">
          {t.docs.map((d, i) => <li key={d} className="rv" style={vars({ '--i': i + 3 })}>{d} <span className="label">0{i + 1}</span></li>)}
        </ul>
        <p className="ask rv" style={vars({ '--i': 7 })}>{t.ask}</p>
      </div>
    </section>
  );
}
