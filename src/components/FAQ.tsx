const QUESTIONS = [
  ['How do I know it was never crashed?', 'Ask for the history and check the car with your own mechanic. We want you to.'],
  ['Can you find a car you don\'t have?', 'Tell us the car you want. We\'ll tell you straight if we can find it.'],
  ['Can I see it in private?', 'Yes. Book a time and the showroom is yours.']
];

/* "Real questions." */
export default function FAQ() {
  return (
    <section className="faq" id="questions">
      <div className="reveal"><h2 className="rv">Real questions.</h2></div>
      <div>
        {QUESTIONS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div>
    </section>
  );
}
