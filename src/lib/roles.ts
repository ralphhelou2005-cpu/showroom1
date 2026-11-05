import type { Database } from '@/types/database';

/* the four roles and how the dashboard names them (shared by the server and the browser) */
export type Role = Database['public']['Enums']['app_role'];
export const ROLES: Role[] = ['OWNER', 'MANAGER', 'SALESPERSON', 'INVENTORY_EDITOR'];
export const ROLE_LABEL: Record<Role, string> = { OWNER: 'Owner', MANAGER: 'Manager', SALESPERSON: 'Salesperson', INVENTORY_EDITOR: 'Inventory editor' };
export const ROLE_SUMMARY: Record<Role, string> = {
  OWNER: 'Everything, including the team and the settings.',
  MANAGER: 'All cars, customers, leads and viewings.',
  SALESPERSON: 'Their own leads and viewings, and new ones to pick up.',
  INVENTORY_EDITOR: 'The cars: listings, photos and text.',
};
