import { getWords } from '@/i18n/server-words';

/* "Real questions." */
export default async function FAQ() {
  const { w: { faq: t } } = await getWords();
  return (
    <section className="faq" id="questions">
      <div className="reveal"><h2 className="rv">{t.title}</h2></div>
      <div>
        {t.items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div>
    </section>
  );
}
