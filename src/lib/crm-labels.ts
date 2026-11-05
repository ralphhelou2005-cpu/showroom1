import type { Enums } from '@/types/database';

/* How the dashboard names the CRM's statuses, sources and history (shared by the browser and the server). */

export const LEAD_STATUS: Record<Enums<'lead_status'>, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', viewing_booked: 'Viewing booked', negotiating: 'Negotiating', won: 'Won', lost: 'Lost',
};
export const LEAD_SOURCE: Record<Enums<'lead_source'>, string> = {
  website_form: 'Website form', private_viewing: 'Viewing request', whatsapp: 'WhatsApp', phone: 'Phone', walk_in: 'Walk-in',
  instagram: 'Instagram', facebook: 'Facebook', referral: 'Referral', other: 'Other',
};
export const VIEWING_STATUS: Record<Enums<'appointment_status'>, string> = {
  requested: 'To approve', confirmed: 'Confirmed', rescheduled: 'Moved, to approve', cancelled: 'Cancelled', completed: 'Done', no_show: 'Didn’t come',
};
export const ACTIVITY: Record<Enums<'activity_type'>, string> = {
  created: 'Lead created', status_changed: 'Status changed', assigned: 'Assigned', vehicle_changed: 'Car changed', follow_up_set: 'Follow-up set',
  note_added: 'Note added', call: 'Call', whatsapp_message: 'WhatsApp message', email: 'Email', meeting: 'Meeting',
  appointment_requested: 'Viewing requested', appointment_confirmed: 'Viewing confirmed', appointment_rescheduled: 'Viewing moved',
  appointment_cancelled: 'Viewing cancelled', appointment_completed: 'Viewing done', appointment_no_show: 'Didn’t come to the viewing',
};
export const OPEN_STATUSES = ['new', 'contacted', 'qualified', 'viewing_booked', 'negotiating'] as const;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
