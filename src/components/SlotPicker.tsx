import { useMemo, useState } from 'react';

/* The booking form's calendar: the next weeks from Monday, the days with free viewing times can be chosen, then a
   time on that day. Nothing chosen means "call me to arrange it". Worked out from the free times alone (the new
   platform's list). A copy of the platform's src/components/SlotPicker.tsx (branch platform): keep the two alike
   until the switch. */

export type Slot = { value: string; day: string; label: string; time: string };
type Words = { time: string; timeAny: string; pickDay: string; pickTime: string };

const DAY = 86_400_000;
const keyOf = (d: Date) => d.toISOString().slice(0, 10);

export default function SlotPicker({ slots, today, locale, t, initial = '' }: {
  slots: Slot[]; today: string; locale: 'en' | 'fr' | 'ar'; t: Words; initial?: string;
}) {
  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) m.set(s.day, [...(m.get(s.day) ?? []), s]);
    return m;
  }, [slots]);
  const days = [...byDay.keys()];
  const [day, setDay] = useState(slots.find(s => s.value === initial)?.day ?? days[0] ?? '');
  const [chosen, setChosen] = useState(slots.find(s => s.value === initial) ?? null);

  const tag = locale === 'ar' ? 'ar-LB-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-GB';
  const first = new Date(today + 'T12:00:00Z');
  const last = new Date((days.at(-1) ?? today) + 'T12:00:00Z');
  const start = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY);   // that week's Monday
  const cells = Array.from({ length: Math.ceil(((last.getTime() - start.getTime()) / DAY + 1) / 7) * 7 }, (_, i) => new Date(start.getTime() + i * DAY));
  const weekday = new Intl.DateTimeFormat(tag, { weekday: 'narrow', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat(tag, { weekday: 'long', timeZone: 'UTC' });
  const num = new Intl.DateTimeFormat(tag, { day: 'numeric', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const months = [...new Set([first, last].map(d => month.format(d)))].join(' – ');
  const times = byDay.get(day) ?? [];

  if (!slots.length) return null;
  return (
    <div className="book-when">
      <span className="label">{t.time}</span>
      <div className="book-cal" role="group" aria-label={t.pickDay}>
        <p className="book-cal-month">{months}</p>
        <div className="book-cal-grid">
          {cells.slice(0, 7).map(d => <abbr key={'h' + keyOf(d)} title={weekdayLong.format(d)}>{weekday.format(d)}</abbr>)}
          {cells.map(d => {
            const k = keyOf(d), open = byDay.has(k);
            if (k < today || k > keyOf(last)) return <span key={k} aria-hidden="true" />;
            return (
              <button key={k} type="button" className="book-day" disabled={!open} aria-pressed={k === day}
                aria-label={open ? byDay.get(k)![0].label : undefined} onClick={() => { setDay(k); if (chosen?.day !== k) setChosen(null); }}>
                {num.format(d)}
              </button>
            );
          })}
        </div>
      </div>
      {times.length > 0 && (
        <div className="book-slots" role="group" aria-label={`${t.pickTime}: ${times[0].label}`}>
          {times.map(s => (
            <button key={s.value} type="button" className="book-slot" aria-pressed={chosen?.value === s.value}
              onClick={() => setChosen(chosen?.value === s.value ? null : s)}>{s.time}</button>
          ))}
        </div>
      )}
      <p className="book-when-note" aria-live="polite">{chosen ? `${chosen.label}, ${chosen.time}` : t.timeAny}</p>
      <input type="hidden" name="starts_at" value={chosen?.value ?? ''} />
      <input type="hidden" name="at_label" value={chosen ? `${chosen.label}, ${chosen.time}` : ''} />
    </div>
  );
}
