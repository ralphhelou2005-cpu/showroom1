import { NextResponse, type NextRequest } from 'next/server';
import { freeSlots, submitBooking } from '@/lib/booking';
import { getBusiness } from '@/lib/catalog';
import { whatsappLink } from '@/lib/labels';

/* The booking form of the current site on GitHub Pages, until the switch: GET gives the calendar's free times and
   the showroom's WhatsApp, POST sends a request (the same checks and saving as this website's own form,
   src/lib/booking.ts). Only the sites in ORIGINS may call it from a browser. Extra addresses (a local copy for the
   tests) go in FORM_ORIGINS, comma separated. */
const ORIGINS = new Set([
  'https://ralphhelou2005-cpu.github.io',
  ...(process.env.NEXT_PUBLIC_SITE_URL ? [new URL(process.env.NEXT_PUBLIC_SITE_URL).origin] : []),
  ...(process.env.FORM_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
]);

function cors(request: NextRequest, res: NextResponse) {
  const origin = request.headers.get('origin');
  if (origin && ORIGINS.has(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export async function OPTIONS(request: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('Access-Control-Max-Age', '86400');
  return cors(request, res);
}

export async function GET(request: NextRequest) {
  const [{ today, slots }, business] = await Promise.all([freeSlots('en'), getBusiness().catch(() => null)]);
  const whatsapp = business?.whatsapp ? whatsappLink(business.whatsapp, 'Hello, I would like to arrange a private viewing.') : null;
  return cors(request, NextResponse.json({ today, slots, whatsapp }, { headers: { 'Cache-Control': 'no-store' } }));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && !ORIGINS.has(origin)) return NextResponse.json({ error: 'failed' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(await request.text()); } catch { return cors(request, NextResponse.json({ error: 'failed' }, { status: 400 })); }
  if (!body || typeof body !== 'object') return cors(request, NextResponse.json({ error: 'failed' }, { status: 400 }));
  const r = await submitBooking(body, typeof body.turnstile === 'string' ? body.turnstile : null);
  return cors(request, NextResponse.json(r, { status: 'error' in r && r.error === 'busy' ? 429 : 200 }));
}
