import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listCarOptions, listCustomers, listSalesTeam } from '@/lib/crm';
import { requireStaff } from '@/lib/staff';
import { NewLeadForm } from '../forms';

export const metadata: Metadata = { title: 'Add a lead' };

export default async function NewLeadPage() {
  const me = await requireStaff();
  if (me.profile.role === 'INVENTORY_EDITOR') redirect('/admin');
  const [customers, cars, team] = await Promise.all([listCustomers(), listCarOptions(), listSalesTeam()]);
  return (
    <>
      <Link href="/admin/leads" className="text-[14px] text-champagne no-underline hover:underline">← Leads</Link>
      <h1 className="mt-4 text-[clamp(38px,6vw,64px)]">Add a lead</h1>
      <p className="mt-3 text-muted">Someone who called, wrote on WhatsApp or Instagram, or walked in. Website requests arrive by themselves.</p>
      <NewLeadForm customers={customers.map(c => ({ id: c.id, name: c.full_name, phone: c.phone }))} cars={cars.filter(c => c.status !== 'sold')}
        team={team} canAssign={me.profile.role !== 'SALESPERSON'} />
    </>
  );
}
