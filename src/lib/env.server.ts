import 'server-only';
import { z } from 'zod';

/* Secrets. They exist only on the server (Vercel's environment settings, or .env.local on your computer):
   'server-only' above makes the build fail if any browser code ever imports this file.
   Integrations are optional: while their keys are missing they stay switched off, and say so. */
const optional = z.string().trim().min(1).optional().catch(undefined);

const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_', 'must be a Supabase secret key (sb_secret_…)'),
  ANALYTICS_SALT: z.string().min(32, 'at least 32 random characters'),
  CRON_SECRET: z.string().min(32, 'at least 32 random characters'),
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  TURNSTILE_SECRET_KEY: optional,
  WHATSAPP_BUSINESS_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  GOOGLE_CALENDAR_CLIENT_EMAIL: optional,
  GOOGLE_CALENDAR_PRIVATE_KEY: optional,
  GOOGLE_CALENDAR_ID: optional,
  SENTRY_DSN: optional,
});

let parsed: z.infer<typeof schema> | undefined;

export function serverEnv() {
  parsed ??= schema.parse(process.env);
  return parsed;
}

/* what is actually connected, for the settings page: nothing claims to work until its keys are set */
export function integrations() {
  const e = serverEnv();
  return {
    email: !!(e.RESEND_API_KEY && e.EMAIL_FROM),
    spamCheck: !!(e.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    whatsappBusiness: !!(e.WHATSAPP_BUSINESS_TOKEN && e.WHATSAPP_PHONE_NUMBER_ID),
    googleCalendar: !!(e.GOOGLE_CALENDAR_CLIENT_EMAIL && e.GOOGLE_CALENDAR_PRIVATE_KEY && e.GOOGLE_CALENDAR_ID),
    errorTracking: !!e.SENTRY_DSN,
  };
}
