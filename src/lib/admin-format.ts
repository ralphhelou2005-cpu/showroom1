/* Dates and times in the dashboard, in the showroom's time zone */
export const SHOWROOM_TZ = 'Asia/Beirut';

const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity]];

/* "3 hours ago", "yesterday", "last week" */
export function ago(iso: string, now = Date.now()) {
  let v = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(v) < size) return rel.format(Math.round(v), unit);
    v /= size;
  }
  return '';
}

/* "5 Nov 2026, 14:30" */
export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: SHOWROOM_TZ }).format(new Date(iso));

/* "Thursday 5 November" */
export const today = () => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: SHOWROOM_TZ }).format(new Date());

/* the showroom's clock: an instant as "2026-11-05T14:30" for a datetime field, and such a value back to an instant */
export function toShowroomInput(iso: string | null) {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: SHOWROOM_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function fromShowroomInput(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const wanted = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = wanted;
  for (let i = 0; i < 2; i++) {
    const shown = toShowroomInput(new Date(t).toISOString()).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)!;
    t += wanted - Date.UTC(+shown[1], +shown[2] - 1, +shown[3], +shown[4], +shown[5]);
  }
  return new Date(t).toISOString();
}
/* "Thu 5 Nov, 14:30" */
export const shortDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: SHOWROOM_TZ }).format(new Date(iso));
export const dayKey = (iso: string) => toShowroomInput(iso).slice(0, 10);
export const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: SHOWROOM_TZ }).format(new Date(iso));
export const time = (iso: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SHOWROOM_TZ }).format(new Date(iso));

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: SHOWROOM_TZ }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
