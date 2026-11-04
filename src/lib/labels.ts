import type { Enums } from '@/types/database';

/* how the showroom names its body types (the filter chips and the cards) */
export const BODY_TYPES: Record<Enums<'body_type'>, string> = {
  supercar: 'Supercars',
  sports_car: 'Sports cars',
  suv: 'SUVs',
  sedan: 'Saloons',
  coupe: 'Coupés',
  convertible: 'Convertibles',
  grand_tourer: 'Grand tourers',
  pickup: 'Pickups',
  classic: 'Classics',
  other: 'Other',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* opening hours as lines: "Mon–Fri 10:00–19:00", "Sat 10:00–14:00" (days in a row with the same hours share a line) */
export function formatHours(hours: { weekday: number; opens: string; closes: string }[]): string[] {
  const byDay = new Map<number, string>();
  for (const h of hours) byDay.set(h.weekday, (byDay.has(h.weekday) ? byDay.get(h.weekday) + ', ' : '') + `${h.opens}–${h.closes}`);
  const order = [1, 2, 3, 4, 5, 6, 0].filter(d => byDay.has(d));
  const lines: string[] = [];
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && byDay.get(order[j + 1]) === byDay.get(order[i]) && (order[j + 1] - order[j] + 7) % 7 === 1) j++;
    lines.push(`${DAYS[order[i]]}${j > i ? '–' + DAYS[order[j]] : ''} ${byDay.get(order[i])}`);
    i = j + 1;
  }
  return lines;
}

/* a WhatsApp chat link from a number in international form (+961…), with an optional first message */
export const whatsappLink = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}${text ? '?text=' + encodeURIComponent(text) : ''}`;

/* "$245,000", or "Price on request" when there is no price */
export function formatPrice(price: number | null, currency = 'USD'): string {
  if (price == null) return 'Price on request';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}
