/* Phase 4 end to end: the dashboard's doors, invitations, roles, access and accounts, in a real browser, against
   the local stand-in for Supabase (e2e/fake-supabase.ts), never the live project.
   1. Start the dashboard pointed at the stand-in (see README, "Testing"):
        NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_local_only
        SUPABASE_SECRET_KEY=sb_secret_e2e_local_only NEXT_PUBLIC_SITE_URL=http://localhost:3300 npx next dev -p 3300
   2. node e2e/dashboard.e2e.ts      (it starts the stand-in itself, fresh each run)
   Screenshots go to e2e/screens/ (not uploaded). */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { outbox, startFake } from './fake-supabase.ts';

const APP = process.env.APP ?? 'http://localhost:3300';
const CHROME = process.env.CHROME ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const SHOTS = join(import.meta.dirname, 'screens'); mkdirSync(SHOTS, { recursive: true });
const STAFF: Record<string, { email: string; password: string; name: string }> = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/staff.json'), 'utf8'));

const { server, db } = await startFake(54321);
let failures = 0, passes = 0;
const check = (ok: boolean, what: string, detail?: unknown) => {
  if (ok) passes++; else failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + what + (ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail)));
};
const q = async (sql: string, p: unknown[] = []) => (await db.query<any>(sql, p)).rows;

const browser: Browser = await chromium.launch({ executablePath: CHROME, args: ['--headless=new'] });
const errors: string[] = [];
async function open(view: 'computer' | 'phone' = 'computer'): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(view === 'phone' ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource: the server responded with a status of 40[134]/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page };
}
async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto(APP + '/admin/login');
  await page.fill('input[name=email]', who.email);
  await page.fill('input[name=password]', who.password);
  await page.click('button[type=submit]');
}
/* the words as written (innerText would give the labels in the capitals the site's style draws them in) */
const text = async (page: Page) => (await page.locator('main').textContent()) ?? '';
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const tile = (page: Page, label: string) => page.locator('div.rounded-3xl', { has: page.locator('p.label', { hasText: new RegExp('^' + label + '$', 'i') }) });

try {
  /* ---------------------------------------------------------- the doors */
  {
    const { ctx, page } = await open();
    const r = await page.goto(APP + '/admin/team');
    check(page.url() === APP + '/admin/login?next=%2Fadmin%2Fteam', 'not signed in: the team page sends you to sign in, remembering where you were', page.url());
    check(r?.headers()['x-robots-tag'] === 'noindex, nofollow', 'dashboard pages tell search engines to stay away');
    await page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await page.screenshot({ caret: 'initial', path: join(SHOTS, 'login-1440.png') });
    await page.click('button[type=submit]');
    check(await page.locator('main [role=alert]').innerText() === 'Enter your email and your password.', 'empty form: asks for email and password');
    await page.fill('input[name=email]', STAFF.owner.email);
    await page.fill('input[name=password]', 'not-the-password');
    await page.click('button[type=submit]');
    await page.locator('main [role=alert]', { hasText: 'don’t match' }).waitFor();
    check(true, 'wrong password: says they don’t match');
    check((await page.locator('input[name=email]').inputValue()) === STAFF.owner.email, 'and keeps the email that was typed');
    await page.fill('input[name=password]', STAFF.owner.password);
    await page.click('button[type=submit]');
    await page.waitForURL(APP + '/admin/team');
    check(true, 'the owner signs in and lands where they were going');
    await page.goto(APP + '/admin/login');
    check(page.url() === APP + '/admin', 'signed in: the login page goes straight to the overview');

    /* the overview's figures are the database's */
    const [inv] = await q(`select count(*) filter (where publication = 'published' and status = 'available')::int on_sale,
                                  count(*) filter (where is_sample and publication = 'published' and status <> 'sold')::int samples from public.vehicles`);
    const t = await text(page);
    check(/Good (morning|afternoon|evening), Minas\./.test(t), 'the overview greets the owner by name');
    check((await tile(page, 'On sale').locator('p').nth(1).innerText()) === String(inv.on_sale), 'cars on sale match the database', inv.on_sale);
    check(t.includes(`${inv.samples} cars on the website are samples`), 'the owner is told how many sample cars are showing');
    check(t.includes('No leads yet.') && t.includes('None booked in the next 7 days.'), 'empty leads and viewings say so plainly');
    check((await tile(page, 'Team').locator('p').nth(1).innerText()) === '5', 'the team tile counts the five people with a role');
    await page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await page.screenshot({ caret: 'initial', path: join(SHOTS, 'overview-1440.png'), fullPage: true });

    /* ---------------------------------------------------------- inviting */
    await page.click('a[href="/admin/team"]');
    await page.waitForURL(APP + '/admin/team');
    let team = await text(page);
    check(team.includes('Minas Missirian (you)') && team.includes('No role: no access'), 'the team list shows everyone, including a login without a role');
    check(await page.locator('li', { hasText: 'Minas Missirian (you)' }).locator('button').count() === 0, 'the owner has no controls on their own line');
    await page.fill('input[name=full_name]', 'Rita Haddad');
    await page.fill('input[name=email]', 'Rita@Milcar.test');
    await page.selectOption('select[name=role]', 'SALESPERSON');
    await page.fill('input[name=phone]', '70 123 456');
    await page.click('button:has-text("Invite")');
    await page.locator('main [role=alert]').waitFor();
    check((await page.locator('main [role=alert]').innerText()).includes('international form'), 'a phone number without its country code is refused with an example');
    await page.fill('input[name=phone]', '+961 70 123 456');
    await page.click('button:has-text("Invite")');
    const panel = page.locator('main [role=status]');
    await panel.waitFor();
    check((await panel.innerText()).includes('Rita Haddad is on the team as salesperson'), 'the invitation is made');
    const link = await panel.locator('input').inputValue();
    const wa = await panel.locator('a', { hasText: 'Send on WhatsApp' }).getAttribute('href');
    check(link.startsWith(APP + '/admin/auth/confirm?token_hash=') && link.includes('welcome=1'), 'the owner gets a one-time link', link);
    check(!!wa?.startsWith('https://wa.me/96170123456?text=') && decodeURIComponent(wa).includes(link), 'WhatsApp opens to Rita with the link written out', wa);
    await page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await page.screenshot({ caret: 'initial', path: join(SHOTS, 'invite-link-1440.png') });
    const [rita] = await q(`select p.id, p.role, p.phone, p.email from public.profiles p where p.email = 'rita@milcar.test'`);
    check(rita?.role === 'SALESPERSON' && rita.phone === '+96170123456', 'Rita’s profile has her role and phone', rita);
    const audit = await q(`select actor_id from public.audit_logs where table_name = 'profiles' and record_id = $1 and action = 'update' order by occurred_at desc limit 1`, [rita.id]);
    check(audit[0]?.actor_id === (await q(`select id from public.profiles where email = $1`, [STAFF.owner.email]))[0].id, 'the audit log records the owner as the one who gave the role', audit);
    await page.click('button:has-text("Invite someone else")');
    await page.fill('input[name=full_name]', 'Rita again');
    await page.fill('input[name=email]', 'rita@milcar.test');
    await page.click('button:has-text("Invite")');
    await page.locator('main [role=alert]').waitFor();
    check((await page.locator('main [role=alert]').innerText()).includes('already has a login'), 'inviting the same email twice is refused kindly');
    await page.reload();
    team = await text(page);
    check(team.includes('Rita Haddad') && team.includes('Invited, hasn’t joined yet'), 'the list shows Rita as invited, not joined');

    /* ---------------------------------------------------------- Rita accepts, on her phone */
    const phone = await open('phone');
    await phone.page.goto(link);
    await phone.page.goto(link);   // WhatsApp's preview opens the link first: opening it must not use it up
    check((await text(phone.page)).includes('Welcome to Milcar'), 'the link opens a welcome page, and opening it twice doesn’t spend it');
    await phone.page.click('button:has-text("Continue")');
    await phone.page.waitForURL(APP + '/admin/password?welcome=1');
    check((await phone.page.locator('input[name=full_name]').inputValue()) === 'Rita Haddad', 'her name is filled in');
    await phone.page.fill('input[name=password]', 'short');
    await phone.page.fill('input[name=repeat]', 'short');
    await phone.page.click('button[type=submit]');
    await phone.page.locator('main [role=alert]').waitFor();
    check((await phone.page.locator('main [role=alert]').innerText()).includes('at least 10'), 'a short password is refused');
    await phone.page.fill('input[name=password]', 'a showroom at night');
    await phone.page.fill('input[name=repeat]', 'a showroom at nite');
    await phone.page.click('button[type=submit]');
    await phone.page.locator('main [role=alert]').filter({ hasText: 'different' }).waitFor();
    check(true, 'two different passwords are refused');
    await phone.page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await phone.page.screenshot({ caret: 'initial', path: join(SHOTS, 'welcome-375.png'), fullPage: true });
    await phone.page.fill('input[name=password]', 'a showroom at night');   // both are emptied after an error, on purpose
    await phone.page.fill('input[name=repeat]', 'a showroom at night');
    await phone.page.click('button[type=submit]');
    await phone.page.waitForURL(APP + '/admin');
    const rt = await text(phone.page);
    check(rt.includes(', Rita.') && rt.includes('Your open leads'), 'Rita lands on her overview, as a salesperson');
    check(await noSideScroll(phone.page), 'the overview fits a phone without sideways scrolling');
    await phone.page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await phone.page.screenshot({ caret: 'initial', path: join(SHOTS, 'overview-375.png'), fullPage: true });
    await phone.page.goto(APP + '/admin/team');
    check(!(await text(phone.page)).includes('Invite someone') && await phone.page.locator('main button').count() === 0, 'a salesperson sees the team but cannot invite or change anyone');
    check(!(await text(phone.page)).includes('stranger@milcar.test'), 'a salesperson doesn’t see logins without a role');
    check(await noSideScroll(phone.page), 'the team page fits a phone');
    await phone.page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await phone.page.screenshot({ caret: 'initial', path: join(SHOTS, 'team-375.png'), fullPage: true });
    const reuse = await open('phone');
    await reuse.page.goto(link);
    await reuse.page.click('button:has-text("Continue")');
    await reuse.page.locator('main [role=alert]').waitFor();
    check((await reuse.page.locator('main [role=alert]').innerText()).includes('already been used'), 'the link works only once');
    await reuse.ctx.close();
    await page.reload();
    check(!(await page.locator('li', { hasText: 'Rita Haddad' }).innerText()).includes('hasn’t joined'), 'once she has chosen a password, the owner sees she has joined');

    /* ---------------------------------------------------------- roles and access */
    const ritaRow = page.locator('li', { hasText: 'Rita Haddad' });
    await ritaRow.locator('select[name=role]').selectOption('MANAGER');
    await ritaRow.locator('button:has-text("Save role")').click();
    await ritaRow.getByText('Saved.').waitFor();
    check((await q(`select role from public.profiles where id = $1`, [rita.id]))[0].role === 'MANAGER', 'the owner makes Rita a manager');
    await phone.page.goto(APP + '/admin');
    check((await text(phone.page)).includes('Open leads'), 'Rita’s overview follows her new role');
    await ritaRow.locator('button:has-text("Switch off")').click();
    await page.locator('li', { hasText: 'Rita Haddad' }).getByText('Switched off.').waitFor();
    check((await q(`select active from public.profiles where id = $1`, [rita.id]))[0].active === false, 'the owner switches Rita off');
    await phone.page.goto(APP + '/admin');
    check(phone.page.url().startsWith(APP + '/admin/login'), 'switched off, Rita is signed out at once', phone.page.url());
    await signIn(phone.page, { email: 'rita@milcar.test', password: 'a showroom at night' });
    await phone.page.locator('main [role=alert]').waitFor();
    check((await phone.page.locator('main [role=alert]').innerText()).includes('switched off'), 'and can’t sign in again');
    await page.locator('li', { hasText: 'Rita Haddad' }).locator('button:has-text("Switch on")').click();
    await page.locator('li', { hasText: 'Rita Haddad' }).getByText('Switched on again.').waitFor();
    await phone.ctx.close();
    const back = await open('phone');
    await signIn(back.page, { email: 'rita@milcar.test', password: 'a showroom at night' });
    await back.page.waitForURL(APP + '/admin');
    check(true, 'switched on again, Rita signs in');
    await back.ctx.close();

    /* the owner gives a forgetful salesperson a new sign-in link */
    const karimRow = page.locator('li', { hasText: STAFF.sales.name });
    await karimRow.locator('button:has-text("New sign-in link")').click();
    const karimLink = await karimRow.getByRole('status').locator('input').inputValue();
    check(!karimLink.includes('welcome=1') && (await karimRow.innerText()).includes('choose a new password'), 'someone who has joined gets a new-password link, not a welcome');
    const karim = await open();
    await karim.page.goto(karimLink);
    check((await text(karim.page)).includes('Your sign-in link'), 'the link opens its page');
    await karim.page.click('button:has-text("Continue")');
    await karim.page.waitForURL(APP + '/admin/password');
    await karim.page.fill('input[name=password]', 'a brand new password');
    await karim.page.fill('input[name=repeat]', 'a brand new password');
    await karim.page.click('button[type=submit]');
    await karim.page.waitForURL(APP + '/admin');
    await karim.ctx.close();
    const k2 = await open();
    await signIn(k2.page, { email: STAFF.sales.email, password: 'a brand new password' });
    await k2.page.waitForURL(APP + '/admin');
    check(true, 'Karim signs in with the password he chose');
    await k2.ctx.close();
    await page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await page.screenshot({ caret: 'initial', path: join(SHOTS, 'team-1440.png'), fullPage: true });

    /* ---------------------------------------------------------- the owner's own account */
    await page.click('a[href="/admin/account"]');
    await page.waitForURL(APP + '/admin/account');
    await page.fill('input[name=phone]', '03 123 456');
    await page.click('button:has-text("Save my details")');
    await page.locator('main [role=alert]').waitFor();
    check((await page.locator('main [role=alert]').innerText()).includes('international form'), 'a local phone number is refused with an example');
    await page.fill('input[name=full_name]', 'Minas M.');
    await page.fill('input[name=phone]', '+961 3 123 456');
    await page.click('button:has-text("Save my details")');
    await page.getByText('Saved.').waitFor();
    check((await page.locator('header').innerText()).includes('Minas M.'), 'a new name shows in the menu at once');
    await page.fill('input[name=current]', 'wrong');
    await page.fill('form:has(input[name=current]) input[name=password]', 'another long password');
    await page.fill('form:has(input[name=current]) input[name=repeat]', 'another long password');
    await page.click('button:has-text("Change my password")');
    await page.locator('main [role=alert]').filter({ hasText: 'current password' }).waitFor();
    check(true, 'a wrong current password is refused');
    await page.fill('input[name=current]', STAFF.owner.password);
    await page.fill('form:has(input[name=current]) input[name=password]', 'another long password');
    await page.fill('form:has(input[name=current]) input[name=repeat]', 'another long password');
    await page.click('button:has-text("Change my password")');
    await page.getByText('Your new password is saved').waitFor();
    check(true, 'the owner changes their password');
    await page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await page.screenshot({ caret: 'initial', path: join(SHOTS, 'account-1440.png'), fullPage: true });
    await page.click('button:has-text("Sign out")');
    await page.waitForURL(APP + '/admin/login');
    await page.goto(APP + '/admin');
    check(page.url().startsWith(APP + '/admin/login'), 'signed out, the dashboard is closed again');
    await signIn(page, { email: STAFF.owner.email, password: 'another long password' });
    await page.waitForURL(APP + '/admin');
    check(true, 'the owner signs in with the new password');
    await ctx.close();
  }

  /* ---------------------------------------------------------- forgot password */
  {
    const { ctx, page } = await open('phone');
    await page.goto(APP + '/admin/login');
    await page.click('a:has-text("Forgot your password?")');
    await page.fill('input[name=email]', 'nobody-here@milcar.test');
    await page.click('button[type=submit]');
    const unknown = await page.locator('main [role=status]').innerText();
    check(outbox.length === 0 && unknown.includes('If that email has a Milcar login'), 'an unknown email gets the same answer, and no email is sent');
    await page.goto(APP + '/admin/forgot');
    await page.fill('input[name=email]', STAFF.editor.email);
    await page.click('button[type=submit]');
    check((await page.locator('main [role=status]').innerText()) === unknown, 'a real email gets exactly the same answer');
    check(outbox.length === 1 && outbox[0].to === STAFF.editor.email && outbox[0].link.startsWith(APP + '/admin/auth/confirm?'), 'the email goes to the right person with a link back to the dashboard', outbox);
    await page.goto(outbox[0].link);
    await page.click('button:has-text("Continue")');
    await page.waitForURL(APP + '/admin/password');
    await page.fill('input[name=password]', 'the editor remembers now');
    await page.fill('input[name=repeat]', 'the editor remembers now');
    await page.click('button[type=submit]');
    await page.waitForURL(APP + '/admin');
    const et = await text(page);
    check(!et.includes('Open leads') && !et.includes('Viewings') && et.includes('On sale'), 'an inventory editor’s overview has the cars, not leads or viewings');
    check(await noSideScroll(page), 'the overview fits a phone');
    await page.goto(APP + '/admin/account');
    check(await noSideScroll(page), 'the account page fits a phone');
    await page.evaluate(() => scrollTo(0, 0));   // pinned parts are drawn where they sit when captured
    await page.screenshot({ caret: 'initial', path: join(SHOTS, 'account-375.png'), fullPage: true });
    await ctx.close();
  }

  /* ---------------------------------------------------------- a login without a role */
  {
    const { ctx, page } = await open();
    await signIn(page, STAFF.nobody);
    await page.waitForURL(APP + '/admin');
    check((await text(page)).includes('No access yet'), 'a login without a role sees “No access yet” and nothing else');
    await page.goto(APP + '/admin/team');
    check((await text(page)).includes('No access yet') && !(await text(page)).includes('Minas'), 'and can’t reach the team either');
    await page.click('button:has-text("Sign out")');
    await page.waitForURL(APP + '/admin/login');
    check(true, 'and can sign out');
    await page.goto(APP + '/admin/nothing-here');
    check(page.url().startsWith(APP + '/admin/login'), 'unknown dashboard addresses are closed too when signed out');
    await ctx.close();
  }

  /* ---------------------------------------------------------- the website is untouched */
  {
    const { ctx, page } = await open();
    const r = await page.goto(APP + '/admin/auth/confirm');
    check(r?.status() === 200 && (await text(page)).includes('This link is incomplete'), 'a link with its token missing says so');
    await ctx.close();
  }
  check(errors.length === 0, 'no errors in the browser', errors);
} catch (e) {
  failures++;
  console.log('FAIL the run stopped: ' + (e as Error).message);
} finally {
  await browser.close();
  server.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}
