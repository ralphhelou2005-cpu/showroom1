import type { Metadata } from 'next';
import Link from 'next/link';
import { listInventory } from '@/lib/inventory';
import { requireStaff } from '@/lib/staff';
import InventoryList from './InventoryList';

export const metadata: Metadata = { title: 'Inventory' };

/* every car, whatever its state: on the website, drafts, reserved, sold, archived */
export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const me = await requireStaff();
  const canEdit = me.profile.role !== 'SALESPERSON';
  const cars = await listInventory();
  const { deleted } = await searchParams;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label">The showroom</p>
          <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Inventory</h1>
        </div>
        {canEdit && <Link href="/admin/inventory/new" className="btn mt-0">Add a car</Link>}
      </div>
      {deleted && <p role="status" className="mt-6 text-champagne-hi">The car was deleted.</p>}
      {!canEdit && <p className="mt-4 text-muted">You can see every car here; the inventory team and managers change them.</p>}
      <InventoryList cars={cars} canEdit={canEdit} />
    </>
  );
}
