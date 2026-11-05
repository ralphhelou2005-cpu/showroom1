import { z } from 'zod';
import type { Enums } from '@/types/database';

/* What the inventory editor sends and the server checks before the database checks it again (part 13). Shared by
   the browser and the server, so both read the same rules. */

export const LOCALES = ['en', 'fr', 'ar'] as const;
export type EditorLocale = (typeof LOCALES)[number];
export const LOCALE_LABEL: Record<EditorLocale, string> = { en: 'English', fr: 'Français', ar: 'العربية' };

export const TEXT_FIELDS = ['title', 'tagline', 'description', 'service_records', 'import_papers', 'seo_title', 'seo_description'] as const;
export type TextField = (typeof TEXT_FIELDS)[number];
export const TEXT_LIMIT: Record<TextField, number> = {
  title: 160, tagline: 160, description: 10000, service_records: 2000, import_papers: 2000, seo_title: 70, seo_description: 170,
};

export const BODY_TYPE_KEYS = ['supercar', 'sports_car', 'suv', 'sedan', 'coupe', 'convertible', 'grand_tourer', 'pickup', 'classic', 'other'] as const satisfies readonly Enums<'body_type'>[];
export const CURRENCIES = ['USD', 'EUR'] as const;

export type Spec = Partial<Record<EditorLocale, { label: string; value: string }>>;

/* the address of a car: "Ferrari F8 Tributo 2020" becomes "ferrari-f8-tributo-2020" */
export function slugify(...parts: (string | number | null | undefined)[]) {
  return parts.filter(p => p != null && String(p).trim() !== '').join(' ')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100).replace(/-+$/, '');
}

const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const optionalInt = (min: number, max: number, message: string) =>
  z.preprocess(v => (blankToNull(v) == null ? null : Number(String(v).replace(/[\s,]/g, ''))), z.number().int(message).min(min, message).max(max, message).nullable());
const optionalText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable());

export const vehicleSchema = z.object({
  slug: z.string().trim().min(1, 'Give the car an address.').max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'The address uses lowercase letters, digits and dashes only.'),
  brand_id: z.uuid('Choose the brand.'),
  model: z.string().trim().min(1, 'Write the model.').max(120),
  variant: optionalText(120),
  body_type: z.enum(BODY_TYPE_KEYS, 'Choose the body type.'),
  model_year: optionalInt(1900, 2100, 'The year is a number between 1900 and 2100.'),
  mileage_km: optionalInt(0, 2_000_000, 'The mileage is a whole number of kilometres.'),
  exterior_color: optionalText(80),
  interior_color: optionalText(80),
  previous_owners: optionalInt(0, 50, 'Previous owners is a whole number.'),
  vin: z.preprocess(v => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim().toUpperCase()) : v),
    z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'A VIN has 17 letters and digits, without I, O or Q.').nullable()),
  price: z.preprocess(v => (blankToNull(v) == null ? null : Number(String(v).replace(/[\s,]/g, ''))),
    z.number('The price is a number.').positive('The price is more than zero.').max(9_999_999_999, 'That price is too large.').nullable()),
  currency: z.enum(CURRENCIES),
  status: z.enum(['available', 'reserved', 'sold']),
  publication: z.enum(['draft', 'published', 'archived']),
  is_featured: z.boolean(),
  featured_rank: optionalInt(1, 99, 'The position is a number from 1.'),
  is_sample: z.boolean(),
  photo_credit: optionalText(200),
});

export const textSchema = z.object(Object.fromEntries(TEXT_FIELDS.map(f => [f, z.string().max(TEXT_LIMIT[f], `${f.replace('_', ' ')}: at most ${TEXT_LIMIT[f]} characters.`).optional()])));

export const editorSchema = z.object({
  id: z.uuid().optional(),
  vehicle: vehicleSchema,
  translations: z.object({ en: textSchema, fr: textSchema, ar: textSchema }),
  specs: z.array(z.object(Object.fromEntries(LOCALES.map(l => [l, z.object({ label: z.string().max(80, 'A spec’s name has at most 80 characters.'), value: z.string().max(200, 'A spec’s value has at most 200 characters.') }).optional()])))).max(60, 'At most 60 specs.'),
});
export type EditorPayload = z.input<typeof editorSchema>;

/* how the editor and the list name statuses */
export const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', sold: 'Sold' } as const;
export const PUBLICATION_LABEL = { draft: 'Draft', published: 'On the website', archived: 'Archived' } as const;
