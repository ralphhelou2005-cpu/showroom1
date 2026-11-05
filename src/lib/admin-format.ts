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

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: SHOWROOM_TZ }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
