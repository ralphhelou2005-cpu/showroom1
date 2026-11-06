/* What the end-to-end tests share: the browser, signing in, checks and screenshots. */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const APP = process.env.APP ?? 'http://localhost:3300';
export const SHOTS = join(import.meta.dirname, 'screens');
mkdirSync(SHOTS, { recursive: true });
export const STAFF: Record<string, { email: string; password: string; name: string }> = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/staff.json'), 'utf8'));

export const result = { passes: 0, failures: 0 };
export function check(ok: boolean, what: string, detail?: unknown) {
  if (ok) result.passes++; else result.failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + what + (ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail)));
}

export const errors: string[] = [];
let browser: Browser;
export async function launch() {
  browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', args: ['--headless=new'] });
  return browser;
}
export async function open(view: 'computer' | 'phone' = 'computer'): Promise<{ ctx: BrowserContext; page: Page }> {
  /* an ordinary Chrome's name, as visitors' browsers give it: the analytics leave out automated browsers ("HeadlessChrome") */
  const userAgent = view === 'phone'
    ? 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
  const ctx = await browser.newContext(view === 'phone' ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, userAgent } : { viewport: { width: 1440, height: 900 }, userAgent });
  const page = await ctx.newPage();
  page.on('console', m => {
    const t = m.text();
    if (m.type() !== 'error' || /favicon|Failed to load resource: the server responded with a status of 40[134]/.test(t)) return;
    /* development only: the home page's walk-in starts before React (Phase 3), so React notes the attributes it changed */
    if (t.includes('A tree hydrated but some attributes') && t.includes('<HomePage>')) return;
    /* development only: arriving at the home page from another page, React notes that the page's engine script
       (public/engine/home.js) won't run; that is on purpose, HomeEngine starts the walk-in instead */
    if (t.startsWith('Encountered a script tag while rendering React component')) return;
    errors.push(t);
  });
  page.on('pageerror', e => errors.push(String(e)));
  waitsForPages(page);
  return { ctx, page };
}

/* A dashboard page switches at once to its placeholder (loading.tsx, marked data-loading), address already changed,
   and its content follows: it has arrived once the placeholder is gone and its title (every page has an h1) is in.
   That includes a page that sends its visitor elsewhere as it streams in. goto, waitForURL and reload wait for that. */
export function waitsForPages(page: Page) {
  const settle = async () => {
    if (!new URL(page.url()).pathname.startsWith('/admin')) return;
    /* the development server fetches nothing ahead, so the address can change while the last page still shows, and a
       page that forwards its visitor replaces the document under any wait: look again until the page is in */
    for (const until = Date.now() + 30000; Date.now() < until; await page.waitForTimeout(100)) {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        if (await page.evaluate(() => !document.querySelector('[data-loading]') && !!document.querySelector('main h1'))) return;
      } catch { /* the page moved on */ }
    }
  };
  const goto = page.goto.bind(page), waitForURL = page.waitForURL.bind(page), reload = page.reload.bind(page);
  page.goto = async (...a: Parameters<Page['goto']>) => { const r = await goto(...a); await settle(); return r; };
  page.waitForURL = async (...a: Parameters<Page['waitForURL']>) => { await waitForURL(...a); await settle(); };
  page.reload = async (...a: Parameters<Page['reload']>) => { const r = await reload(...a); await settle(); return r; };
}
export async function signIn(page: Page, who: { email: string; password: string }, then = '/admin') {
  await page.goto(APP + '/admin/login?next=' + encodeURIComponent(then));
  await page.fill('input[name=email]', who.email);
  await page.fill('input[name=password]', who.password);
  await page.click('button[type=submit]');
  await page.waitForURL(u => u.pathname === then);
}
/* the words as written (innerText would give the labels in the capitals the site's style draws them in) */
export const text = async (page: Page, where = 'main') => (await page.locator(where).first().textContent()) ?? '';
export const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
/* pinned parts are drawn where they sit when captured, so screenshots start from the top */
export async function shot(page: Page, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: true, caret: 'initial' });
}
export async function finish(close: () => void) {
  check(errors.length === 0, 'no errors in the browser', errors);
  await browser.close();
  close();
  console.log(`\n${result.passes} passed, ${result.failures} failed`);
  process.exit(result.failures ? 1 : 0);
}
