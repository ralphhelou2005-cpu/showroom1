import { NextResponse, type NextRequest } from 'next/server';
import { csv, listCustomers } from '@/lib/crm';
import { currentStaff } from '@/lib/staff';

/* the customers as a spreadsheet, read as the person, so it holds what they may see */
export async function GET(request: NextRequest) {
  const me = await currentStaff();
  if (!me?.profile?.role || !me.profile.active || me.profile.role === 'INVENTORY_EDITOR') return new NextResponse('Not allowed', { status: 403 });
  const q = (request.nextUrl.searchParams.get('q') ?? '').toLowerCase();
  const rows = (await listCustomers()).filter(c => !q || `${c.full_name} ${c.phone} ${c.email}`.toLowerCase().includes(q));
  const body = csv([
    ['Name', 'Phone', 'Email', 'Language', 'Prefers', 'Agreed to hear about new cars', 'Leads', 'Since'],
    ...rows.map(c => [c.full_name, c.phone, c.email, c.preferred_locale, c.preferred_contact, c.marketing_consent ? 'yes' : 'no', c.leads.length, c.created_at]),
  ]);
  return new NextResponse(body, { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="milcar-customers-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'private, no-store',
  } });
}
