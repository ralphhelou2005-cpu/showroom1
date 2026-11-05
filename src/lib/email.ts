import 'server-only';
import { publicEnv } from './env';
import { secretKey } from './env.server';
import { supabaseAdmin } from './supabase/admin';

/* Emails to customers and staff, through Resend once RESEND_API_KEY and EMAIL_FROM are set. Every email is
   recorded in the notifications table: sent (only once Resend accepted it), failed with the reason, or skipped
   while email isn't connected. Nothing claims to be sent that wasn't. */

type Locale = 'en' | 'fr' | 'ar';
type Mail = { to: string; subject: string; text: string; template: string; locale?: Locale; leadId?: string | null; appointmentId?: string | null };

export const emailConnected = () => !!(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export async function sendEmail(m: Mail) {
  let status: 'sent' | 'failed' | 'skipped' = 'skipped', error: string | null = 'Email isn’t connected (RESEND_API_KEY and EMAIL_FROM).', providerId: string | null = null;
  if (emailConnected()) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, text: m.text }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.id) { status = 'sent'; error = null; providerId = body.id; }
      else { status = 'failed'; error = String(body.message ?? `Resend answered ${r.status}`).slice(0, 1000); }
    } catch (e) {
      status = 'failed'; error = ('Resend could not be reached: ' + (e as Error).message).slice(0, 1000);
    }
  }
  if (secretKey()) {
    const { error: e } = await supabaseAdmin().from('notifications').insert({
      channel: 'email', template: m.template, locale: m.locale ?? 'en', recipient_email: m.to, status, attempts: status === 'skipped' ? 0 : 1,
      last_error: error, provider_message_id: providerId, sent_at: status === 'sent' ? new Date().toISOString() : null,
      related_lead_id: m.leadId ?? null, related_appointment_id: m.appointmentId ?? null, payload: { subject: m.subject },
    });
    if (e) console.error('recording an email failed:', e.message);
  }
  return status;
}

/* who hears about new inquiries: the addresses in Settings, else every active owner and manager */
export async function staffRecipients(): Promise<string[]> {
  if (!secretKey()) return [];
  const admin = supabaseAdmin();
  const { data: s } = await admin.from('site_settings').select('value').eq('key', 'notifications.email').maybeSingle();
  const listed = ((s?.value as { staff_recipients?: string[] } | null)?.staff_recipients ?? []).filter(Boolean);
  if (listed.length) return listed;
  const { data } = await admin.from('profiles').select('email').in('role', ['OWNER', 'MANAGER']).eq('active', true);
  return (data ?? []).map(p => p.email).filter((e): e is string => !!e);
}

const site = () => publicEnv().NEXT_PUBLIC_SITE_URL;
const when = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Beirut' }).format(new Date(iso));

/* the customer's emails, in their language */
const CUSTOMER = {
  en: {
    received: (name: string, at: string | null) => ({ subject: 'We received your request', text: `Hello ${name},\n\nThank you for contacting Milcar. ${at ? `You asked to see the car on ${at}. We'll confirm the time shortly.` : 'We’ll call you shortly to arrange a time.'}\n\nMilcar Automotive Consultancy\n${site()}` }),
    confirmed: (name: string, at: string) => ({ subject: 'Your private viewing is confirmed', text: `Hello ${name},\n\nYour private viewing is confirmed for ${at}. We look forward to seeing you.\n\nMilcar Automotive Consultancy\n${site()}` }),
    moved: (name: string, at: string) => ({ subject: 'Your private viewing has a new time', text: `Hello ${name},\n\nYour private viewing is now on ${at}. If that doesn't suit you, just reply or call us.\n\nMilcar Automotive Consultancy\n${site()}` }),
    cancelled: (name: string, at: string) => ({ subject: 'Your private viewing is cancelled', text: `Hello ${name},\n\nYour private viewing on ${at} is cancelled. We'd be glad to find another time.\n\nMilcar Automotive Consultancy\n${site()}` }),
  },
  fr: {
    received: (name: string, at: string | null) => ({ subject: 'Nous avons bien reçu votre demande', text: `Bonjour ${name},\n\nMerci d’avoir contacté Milcar. ${at ? `Vous souhaitez voir la voiture le ${at}. Nous vous confirmons l’horaire très bientôt.` : 'Nous vous appelons très bientôt pour convenir d’un moment.'}\n\nMilcar Automotive Consultancy\n${site()}/fr` }),
    confirmed: (name: string, at: string) => ({ subject: 'Votre visite privée est confirmée', text: `Bonjour ${name},\n\nVotre visite privée est confirmée pour le ${at}. Nous nous réjouissons de vous accueillir.\n\nMilcar Automotive Consultancy\n${site()}/fr` }),
    moved: (name: string, at: string) => ({ subject: 'Votre visite privée a un nouvel horaire', text: `Bonjour ${name},\n\nVotre visite privée a désormais lieu le ${at}. Si cela ne vous convient pas, répondez simplement ou appelez-nous.\n\nMilcar Automotive Consultancy\n${site()}/fr` }),
    cancelled: (name: string, at: string) => ({ subject: 'Votre visite privée est annulée', text: `Bonjour ${name},\n\nVotre visite privée du ${at} est annulée. Nous serons ravis de trouver un autre moment.\n\nMilcar Automotive Consultancy\n${site()}/fr` }),
  },
  ar: {
    received: (name: string, at: string | null) => ({ subject: 'تلقّينا طلبك', text: `مرحباً ${name}،\n\nشكراً لتواصلك مع ميلكار. ${at ? `طلبتَ معاينة السيارة يوم ${at}. سنؤكّد الموعد قريباً.` : 'سنتصل بك قريباً لتحديد موعد.'}\n\nميلكار للاستشارات في عالم السيارات\n${site()}/ar` }),
    confirmed: (name: string, at: string) => ({ subject: 'تمّ تأكيد معاينتك الخاصة', text: `مرحباً ${name}،\n\nتمّ تأكيد معاينتك الخاصة يوم ${at}. يسعدنا استقبالك.\n\nميلكار للاستشارات في عالم السيارات\n${site()}/ar` }),
    moved: (name: string, at: string) => ({ subject: 'موعد جديد لمعاينتك الخاصة', text: `مرحباً ${name}،\n\nأصبح موعد معاينتك الخاصة يوم ${at}. إن لم يناسبك، يكفي أن تردّ على هذه الرسالة أو تتصل بنا.\n\nميلكار للاستشارات في عالم السيارات\n${site()}/ar` }),
    cancelled: (name: string, at: string) => ({ subject: 'أُلغيت معاينتك الخاصة', text: `مرحباً ${name}،\n\nأُلغيت معاينتك الخاصة يوم ${at}. يسعدنا أن نجد موعداً آخر.\n\nميلكار للاستشارات في عالم السيارات\n${site()}/ar` }),
  },
};

export async function emailCustomer(kind: 'received' | 'confirmed' | 'moved' | 'cancelled', c: { email: string | null; name: string; locale?: string | null },
  at: string | null, ids: { leadId?: string | null; appointmentId?: string | null }) {
  if (!c.email) return null;
  const locale = (['en', 'fr', 'ar'].includes(c.locale ?? '') ? c.locale : 'en') as Locale;
  const t = CUSTOMER[locale];
  const m = kind === 'received' ? t.received(c.name, at && when(at, locale)) : t[kind](c.name, when(at!, locale));
  return sendEmail({ to: c.email, ...m, template: `booking.${kind}`, locale, ...ids });
}

export async function emailStaffAboutInquiry(i: { name: string; phone: string | null; email: string | null; car: string | null; at: string | null; message: string | null; leadId: string; appointmentId: string | null }) {
  const lines = [
    `${i.name} contacted Milcar from the website${i.car ? ` about the ${i.car}` : ''}.`,
    i.at ? `Asked for a private viewing on ${when(i.at, 'en')}.` : 'No time chosen: call them to arrange one.',
    i.phone ? `Phone: ${i.phone}` : null, i.email ? `Email: ${i.email}` : null, i.message ? `\n“${i.message}”` : null,
    `\nOpen the lead: ${site()}/admin/leads/${i.leadId}`,
  ].filter(Boolean).join('\n');
  for (const to of await staffRecipients()) {
    await sendEmail({ to, subject: i.at ? `Viewing request: ${i.name}` : `New inquiry: ${i.name}`, text: lines, template: 'staff.new_inquiry', leadId: i.leadId, appointmentId: i.appointmentId });
  }
}
