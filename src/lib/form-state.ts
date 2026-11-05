/* What a dashboard form's server action answers.
   `values`: what the person typed, handed back with an error so the form keeps it (React empties a form after
   each send). Passwords are never handed back. */
export type FormState = {
  error?: string;
  done?: string;
  values?: Record<string, string>;
  link?: { url: string; whatsapp: string; name: string };
} | null;

/* the typed values of the named fields, for handing back */
export const typed = (form: FormData, ...names: string[]) => Object.fromEntries(names.map(n => [n, String(form.get(n) ?? '')]));
