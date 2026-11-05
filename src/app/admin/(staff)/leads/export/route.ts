import { NextResponse, type NextRequest } from 'next/server';
import { LEAD_SOURCE, LEAD_STATUS, OPEN_STATUSES } from '@/lib/crm-labels';
import { csv, listLeads, listSalesTeam } from '@/lib/crm';
import { currentStaff } from '@/lib/staff';

/* the leads list as a spreadsheet, with the same filters; read as the person, so it holds what they may see */
export async function GET(request: NextRequest) {
  const me = await currentStaff();
  if (!me?.profile?.role || !me.profile.active || me.profile.role === 'INVENTORY_EDITOR') return new NextResponse('Not allowed', { status: 403 });
  const sp = request.nextUrl.searchParams;
  const status = sp.get('status') ?? 'all', who = sp.get('who') ?? 'all', source = sp.get('source') ?? 'all', q = (sp.get('q') ?? '').toLowerCase();
  const [leads, team] = await Promise.all([listLeads(), listSalesTeam()]);
  const names = new Map(team.map(t => [t.id, t.name]));
  const open = OPEN_STATUSES as readonly string[];
  const rows = leads.filter(l =>
    (status === 'all' || (status === 'open' ? open.includes(l.status) : status === 'due' ? open.includes(l.status) && !!l.next_follow_up_at && new Date(l.next_follow_up_at) <= new Date() : l.status === status)) &&
    (who === 'all' || (who === 'mine' ? l.assigned_to === me.id : who === 'unassigned' ? !l.assigned_to : l.assigned_to === who)) &&
    (source === 'all' || l.source === source) &&
    (!q || `${l.customers?.full_name} ${l.customers?.phone} ${l.customers?.email} ${l.car}`.toLowerCase().includes(q)));
  const body = csv([
    ['Created', 'Customer', 'Phone', 'Email', 'Car', 'Source', 'Status', 'Assigned to', 'Next follow-up', 'Closed', 'Message'],
    ...rows.map(l => [l.created_at, l.customers?.full_name, l.customers?.phone, l.customers?.email, l.car, LEAD_SOURCE[l.source], LEAD_STATUS[l.status],
      l.assigned_to ? names.get(l.assigned_to) ?? '' : '', l.next_follow_up_at, l.closed_at, l.message]),
  ]);
  return new NextResponse(body, { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="milcar-leads-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'private, no-store',
  } });
}
