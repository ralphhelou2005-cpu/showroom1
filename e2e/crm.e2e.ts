/* Phases 6 to 9 end to end, against the local stand-in for Supabase (never the live project): the website's booking
   form, the settings, the viewings, leads and customers with their CSV, a salesperson's limits, analytics, the French
   and Arabic pages and the sitemap. Start the dashboard as for e2e/dashboard.e2e.ts, with ANALYTICS_SALT set too. */
import { APP, check, finish, launch, noSideScroll, open, shot, signIn, STAFF, text } from './helpers.ts';
import { startFake } from './fake-supabase.ts';

const { server, db } = await startFake(54321);
await launch();
const q = async (sql: string, p: unknown[] = []) => (await db.query<any>(sql, p)).rows;

try {
  /* ---------------------------------------------------------- a visitor asks, before opening hours exist */
  const v = await open('phone');
  await v.page.goto(APP + '/car/f8-tributo');
  await v.page.click('a.btn:has-text("Book a private viewing")');
  await v.page.waitForURL(u => u.pathname === '/' && u.hash === '#book');
  await v.page.waitForFunction(() => (document.querySelector('#book input[name=car]') as HTMLInputElement)?.value.length > 0);
  check(await v.page.locator('#book select[name=starts_at]').count() === 0, 'without opening hours the form has no time field, as before');
  await v.page.fill('#book input[name=name]', 'Rami Khoury');
  await v.page.fill('#book input[name=phone]', '03 123 456');
  await v.page.click('#bookEnd');
  await v.page.locator('#book [role=alert]').waitFor();
  check((await v.page.locator('#book [role=alert]').innerText()).includes('country code'), 'a phone without its country code is refused kindly');
  await v.page.fill('#book input[name=phone]', '+961 3 123 456');
  await v.page.click('#bookEnd');
  await v.page.locator('#bookForm.sent').waitFor();
  check((await text(v.page, '#book .done-msg')).includes('We’ll call you shortly'), 'sent: the visitor is told they’ll be called');
  const [lead1] = await q(`select l.id, l.source, l.message, v.slug, c.phone from public.leads l join public.customers c on c.id = l.customer_id left join public.vehicles v on v.id = l.vehicle_id`);
  check(lead1?.source === 'website_form' && lead1.slug === 'f8-tributo' && lead1.phone === '+9613123456', 'the lead is saved with its car and the customer', lead1);
  const mails = await q(`select status, template, last_error from public.notifications`);
  check(mails.length >= 1 && mails.every(m => m.status === 'skipped' && m.template === 'staff.new_inquiry' && /isn’t connected/.test(m.last_error)), 'the team’s email is recorded as skipped while email isn’t connected', mails);
  await v.page.goto(APP + '/');
  await v.page.fill('#book input[name=name]', 'Robot');
  await v.page.fill('#book input[name=phone]', '+961 3 999 999');
  await v.page.locator('#book input[name=company]').evaluate((i: HTMLInputElement) => { i.value = 'spam inc'; });
  await v.page.click('#bookEnd');
  await v.page.locator('#bookForm.sent').waitFor();
  check((await q(`select count(*)::int n from public.leads`))[0].n === 1, 'a robot filling the hidden trap is thanked, and nothing is saved');
  await v.ctx.close();

  /* ---------------------------------------------------------- the owner sets the showroom up */
  const { ctx, page } = await open();
  await signIn(page, STAFF.owner);
  await page.goto(APP + '/admin/settings');
  await page.fill('input[name=phone]', '+961 1 234 567');
  await page.fill('input[name=whatsapp]', '+961 70 123 456');
  await page.fill('input[name=address]', 'Dbayeh Highway, Lebanon');
  await page.click('button:has-text("Save the details")');
  await page.getByText('Saved. The footer and the contact page show them now.').waitFor();
  for (const d of [1, 2, 3, 4, 5, 6]) { await page.fill(`input[name=d${d}o1]`, '10:00'); await page.fill(`input[name=d${d}c1]`, '19:00'); }
  await page.click('button:has-text("Save the hours")');
  await page.getByText('Visitors can now ask for a time').waitFor();
  check((await q(`select count(*)::int n from public.business_hours`))[0].n === 6, 'the owner sets opening hours, Monday to Saturday');
  check((await text(page)).includes('Email to customers and staff (Resend) · Not connected'), 'Settings says plainly what isn’t connected');
  await shot(page, 'settings-1440');

  /* ---------------------------------------------------------- now the visitor can choose a time */
  const v2 = await open();
  await v2.page.goto(APP + '/contact');
  check((await text(v2.page)).includes('Dbayeh Highway, Lebanon') && (await text(v2.page)).includes('Mon–Sat 10:00–19:00'), 'the contact page shows the address and the hours');
  const options = v2.page.locator('#book select[name=starts_at] option');
  check(await options.count() > 5, 'the form offers free times within the opening hours');
  await v2.page.fill('#book input[name=name]', 'Nadia Saab');
  await v2.page.fill('#book input[name=phone]', '+961 70 111 222');
  await v2.page.fill('#book input[name=car]', 'Mercedes-AMG G 63');
  await v2.page.locator('#book select[name=starts_at]').selectOption({ index: 3 });
  await v2.page.click('#bookEnd');
  await v2.page.locator('#bookForm.sent').waitFor();
  check((await text(v2.page, '#book .done-msg')).includes('We’ve noted'), 'with a time, the visitor is told it is noted, to be confirmed');
  const [appt] = await q(`select a.id, a.status, c.full_name from public.appointments a join public.customers c on c.id = a.customer_id`);
  check(appt?.status === 'requested' && appt.full_name === 'Nadia Saab', 'the viewing is requested, waiting for approval', appt);
  check((await text(v2.page, 'footer')).includes('+961 1 234 567'), 'the footer shows the phone number');
  await v2.page.goto(APP + '/inventory');
  await v2.page.goto(APP + '/car/g63');
  for (let i = 0; i < 50 && !(await q(`select 1 from public.analytics_events e join public.vehicles v on v.id = e.vehicle_id where e.type = 'vehicle_view' and v.slug = 'g63'`)).length; i++) await v2.page.waitForTimeout(100);
  await v2.ctx.close();

  /* ---------------------------------------------------------- viewings, leads, customers */
  await page.goto(APP + '/admin/viewings');
  check((await text(page)).includes('Nadia Saab'), 'the request is in the viewings’ “To approve”');
  await page.locator('li', { hasText: 'Nadia Saab' }).locator('button:has-text("Confirm")').click();
  await page.locator('section[aria-labelledby=coming] li', { hasText: 'Nadia Saab' }).waitFor();   // it moves to "Coming up"
  check((await q(`select status, confirmed_by is not null as by from public.appointments where id = $1`, [appt.id]))[0].status === 'confirmed', 'the owner confirms it');
  await page.goto(APP + '/admin/leads');
  check(await page.locator('main ol > li').count() === 2, 'both inquiries are leads');
  await page.locator('main ol > li', { hasText: 'Rami Khoury' }).locator('a').click();
  await page.waitForURL(/\/admin\/leads\/[0-9a-f-]{36}$/);
  check(!!(await page.locator('a:has-text("WhatsApp")').first().getAttribute('href'))?.startsWith('https://wa.me/9613123456'), 'the lead has a WhatsApp button to the customer');
  await page.fill('textarea[name=body]', 'Wants it before Christmas.');
  await page.click('button:has-text("Add the note")');
  await page.getByText('Note added.').waitFor();
  await page.fill('input[name=summary]', 'Called, will visit Saturday');
  await page.click('button:has-text("Add to the history")');
  await page.getByText('Added to the history.').waitFor();
  check((await q(`select status from public.leads where id = $1`, [lead1.id]))[0].status === 'contacted', 'logging a call moves a new lead to “Contacted”');
  await page.locator('select[name=assigned_to]').last().selectOption({ label: STAFF.sales.name });
  await page.fill('input[name=next_follow_up_at]', '2026-01-05T10:00');
  await page.click('aside button:has-text("Save")');
  await page.locator('aside').getByText('Saved.').waitFor();
  const l1 = (await q(`select assigned_to, next_follow_up_at from public.leads where id = $1`, [lead1.id]))[0];
  check(!!l1.assigned_to && !!l1.next_follow_up_at, 'the owner assigns it and sets a follow-up');
  const acts = await q(`select type from public.lead_activities where lead_id = $1 order by occurred_at`, [lead1.id]);
  check(['created', 'call', 'status_changed', 'assigned', 'follow_up_set'].every(t => acts.some(a => a.type === t)), 'the history records each step', acts.map(a => a.type));
  await page.reload();
  check((await text(page)).includes('Wants it before Christmas.') && (await text(page)).includes('Called, will visit Saturday'), 'the note and the call show in the history');
  await page.goto(APP + '/admin/leads?status=due');
  check((await text(page)).includes('Rami Khoury'), '“Follow-up due” lists it');
  const csv = await page.request.get(APP + '/admin/leads/export?status=all');
  const body = await csv.text();
  check(csv.status() === 200 && body.includes('Rami Khoury') && body.includes('Nadia Saab') && csv.headers()['content-type']?.includes('text/csv'), 'the leads download as a spreadsheet');
  const ccsv = await page.request.get(APP + '/admin/customers/export');
  check(ccsv.status() === 200 && (await ccsv.text()).includes('+96170111222'), 'and the customers too');
  await page.goto(APP + '/admin/customers');
  await page.locator('main ol > li', { hasText: 'Nadia Saab' }).locator('a').click();
  await page.fill('input[name=email]', 'nadia@example.com');
  await page.click('button:has-text("Save")');
  await page.getByText('Saved.').waitFor();
  check((await q(`select email from public.customers where full_name = 'Nadia Saab'`))[0].email === 'nadia@example.com', 'a customer’s details are edited');
  await shot(page, 'customer-1440');

  /* ---------------------------------------------------------- analytics */
  await page.goto(APP + '/admin/analytics');
  const visits = (await q(`select count(*)::int n from public.analytics_events where type = 'page_view'`))[0].n;
  check(visits > 0 && (await q(`select count(*)::int n from public.analytics_events where type = 'vehicle_view'`))[0].n > 0, 'visits and car views were recorded, without cookies', visits);
  check(!(await text(page)).includes('No visits recorded') && (await text(page)).includes('Mercedes-AMG G 63'), 'the analytics page shows them, with the most seen cars');
  await shot(page, 'analytics-1440');
  await ctx.close();

  /* ---------------------------------------------------------- a salesperson */
  const s = await open('phone');
  await signIn(s.page, STAFF.sales);
  check(await s.page.locator('nav a[href="/admin/settings"]').count() === 0 && await s.page.locator('nav a[href="/admin/analytics"]').count() === 0, 'a salesperson’s menu has no settings or analytics');
  await s.page.goto(APP + '/admin/leads?who=all&status=all');
  check((await text(s.page)).includes('Rami Khoury') && (await text(s.page)).includes('Nadia Saab'), 'a salesperson sees their lead and the unassigned one');
  await s.page.goto(APP + '/admin/viewings');
  check(await s.page.locator('button:has-text("Confirm")').count() === 0, 'and can’t confirm viewings');
  check(await noSideScroll(s.page), 'the viewings fit a phone');
  await s.page.goto(APP + '/admin/settings');
  check(s.page.url() === APP + '/admin', 'Settings sends a salesperson back to the overview');
  await s.ctx.close();

  /* ---------------------------------------------------------- French and Arabic */
  const fr = await open();
  await fr.page.goto(APP + '/fr/inventory');
  check(await fr.page.getAttribute('html', 'lang') === 'fr' && (await text(fr.page)).includes('Nos voitures') && (await text(fr.page)).includes('Toutes les marques'), 'the French inventory is in French');
  check(!!(await fr.page.locator('link[rel=alternate][hreflang=ar]').getAttribute('href'))?.endsWith('/ar/inventory'), 'it points search engines to the Arabic page');
  await fr.page.click('footer a[hreflang=en]');
  await fr.page.waitForURL(APP + '/inventory');
  check(true, 'the footer switches back to English on the same page');
  await fr.ctx.close();
  const ar = await open('phone');
  await ar.page.goto(APP + '/ar');
  check(await ar.page.getAttribute('html', 'dir') === 'rtl' && (await text(ar.page)).includes('احجز معاينة خاصة'), 'the Arabic home page reads right to left, in Arabic');
  await ar.page.goto(APP + '/ar/car/f8-tributo');
  check((await text(ar.page)).includes('مواصفات المصنع') && await noSideScroll(ar.page), 'the Arabic car page is in Arabic and fits a phone');
  await shot(ar.page, 'car-ar-375');
  await ar.page.goto(APP + '/ar/inventory');
  check(await noSideScroll(ar.page), 'the Arabic inventory fits a phone');
  await shot(ar.page, 'inventory-ar-375');
  const sm = await (await fetch(APP + '/sitemap.xml')).text();
  check(sm.includes('/fr/car/f8-tributo') && sm.includes('/ar/inventory') && sm.includes('hreflang'), 'the sitemap lists every page in the three languages');
  check((await (await fetch(APP + '/robots.txt')).text()).includes('Disallow: /admin'), 'robots.txt keeps search engines out of the dashboard');
  await ar.ctx.close();
} catch (e) {
  check(false, 'the run stopped: ' + (e as Error).message);
}
await finish(() => server.close());
