import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { secretKey } from '@/lib/env.server';
import { clientIp } from '@/lib/staff';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { visitorHash } from '@/lib/visitor';

/* The website's own analytics, without cookies: each event is stored with an anonymous code made from the day,
   the visitor's address and browser and a secret, so a visitor counts once a day and can't be followed from one
   day to the next. Nothing is stored until ANALYTICS_SALT and the server key are set; robots are left out. */

const event = z.object({
  type: z.enum(['page_view', 'vehicle_view', 'whatsapp_click', 'phone_click']),
  path: z.string().max(300).regex(/^\//),
  locale: z.enum(['en', 'fr', 'ar']).optional(),
  slug: z.string().max(100).regex(/^[a-z0-9-]+$/).optional(),
  referrer: z.string().max(253).optional(),
  utm_source: z.string().max(100).optional(), utm_medium: z.string().max(100).optional(), utm_campaign: z.string().max(100).optional(),
});
/* robots, link previews, and automated browsers (HeadlessChrome, the host's own checks after each deployment) */
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|pingdom|monitor|headless|vercel|playwright|puppeteer|selenium/i;

export async function POST(request: NextRequest) {
  if (!secretKey() || (process.env.ANALYTICS_SALT?.length ?? 0) < 32) return new NextResponse(null, { status: 204 });
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || BOTS.test(ua)) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try { body = JSON.parse(await request.text()); } catch { return new NextResponse(null, { status: 400 }); }
  const p = event.safeParse(body);
  if (!p.success) return new NextResponse(null, { status: 400 });
  const visitor = visitorHash(await clientIp(), ua);
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop';
  const country = request.headers.get('x-vercel-ip-country');
  const own = request.nextUrl.hostname;
  const admin = supabaseAdmin();
  let vehicle: string | null = null;
  if (p.data.slug) vehicle = (await admin.from('vehicles').select('id').eq('slug', p.data.slug).maybeSingle()).data?.id ?? null;
  const { error } = await admin.from('analytics_events').insert({
    type: p.data.type, path: p.data.path, locale: p.data.locale ?? null, vehicle_id: vehicle, visitor_hash: visitor,
    referrer_host: p.data.referrer && p.data.referrer !== own ? p.data.referrer.toLowerCase() : null,
    utm_source: p.data.utm_source?.toLowerCase() ?? null, utm_medium: p.data.utm_medium ?? null, utm_campaign: p.data.utm_campaign ?? null,
    device, country: country && /^[A-Z]{2}$/.test(country) ? country : null,
  });
  if (error) console.error('analytics event not saved:', error.message);
  return new NextResponse(null, { status: 204 });
}
