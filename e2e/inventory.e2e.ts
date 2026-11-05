/* Phase 5 end to end: the inventory editor, from a new draft to the public pages, with photos, a video, three
   languages and each role, against the local stand-in for Supabase (never the live project).
   Start the dashboard as for e2e/dashboard.e2e.ts, then: node e2e/inventory.e2e.ts */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright-core';
import { APP, check, finish, launch, noSideScroll, open, shot, signIn, STAFF, text } from './helpers.ts';
import { startFake } from './fake-supabase.ts';

const { server, db, url: SUPABASE } = await startFake(54321);
await launch();
const q = async (sql: string, p: unknown[] = []) => (await db.query<any>(sql, p)).rows;

/* a photo made in the browser: a 1800 × 1200 JPEG */
async function photo(page: Page, hue: number) {
  const data = await page.evaluate(h => {
    const c = document.createElement('canvas'); c.width = 1800; c.height = 1200;
    const g = c.getContext('2d')!, grad = g.createLinearGradient(0, 0, 1800, 1200);
    grad.addColorStop(0, `hsl(${h} 70% 40%)`); grad.addColorStop(1, `hsl(${h + 40} 60% 15%)`);
    g.fillStyle = grad; g.fillRect(0, 0, 1800, 1200);
    g.fillStyle = '#fff'; g.font = '120px serif'; g.fillText('Milcar test ' + h, 200, 600);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }, hue);
  return { name: `photo-${hue}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(data, 'base64') };
}
const video = { name: 'walk.mp4', mimeType: 'video/mp4', buffer: readFileSync(join(import.meta.dirname, '../public/assets/walk/fast-phone.mp4')) };
const status = (page: Page) => page.locator('main [role=status]');
const alert = (page: Page) => page.locator('main [role=alert]');

try {
  /* ---------------------------------------------------------- the list */
  const { ctx, page } = await open();
  await signIn(page, STAFF.owner);
  await page.click('nav a[href="/admin/inventory"]');
  await page.waitForURL(APP + '/admin/inventory');
  const cars = await q(`select count(*)::int n from public.vehicles`);
  check((await text(page)).includes(`${cars[0].n} cars, in the website’s order`), 'the inventory lists every car, in the website’s order');
  await page.fill('input[type=search]', 'lambo');
  check((await page.locator('main ol > li').count()) === 2, 'searching “lambo” finds the two Lamborghinis');
  await page.fill('input[type=search]', '');
  await page.locator('main select').first().selectOption('draft');
  check((await text(page)).includes('No car matches'), 'no draft yet: the list says so');
  await page.locator('main select').first().selectOption('all');
  await shot(page, 'inventory-1440');

  /* ---------------------------------------------------------- a new car */
  await page.click('a:has-text("Add a car")');
  await page.waitForURL(APP + '/admin/inventory/new');
  await page.selectOption('select[name=brand_id]', { label: 'Ferrari' });
  await page.fill('input[name=model]', 'Roma');
  await page.selectOption('select[name=body_type]', 'grand_tourer');
  await page.fill('input[name=model_year]', '2023');
  check((await page.inputValue('input[name=slug]')) === 'ferrari-roma-2023', 'the address is made from the brand, model and year');
  await page.fill('input[name=mileage_km]', '4,200');
  await page.fill('input[name=exterior_color]', 'Blu Pozzi');
  await page.fill('input[name=price]', '245000');
  await page.fill('input[name=vin]', 'ZFF98RNO0P0123456');   // an O: never in a VIN
  await page.fill('input[name=en-tagline]', 'La nuova dolce vita');
  await page.fill('textarea[name=en-description]', 'One owner from new, full Ferrari main-dealer history, never tracked.');
  await page.getByRole('tab', { name: 'العربية' }).first().click();
  check((await page.locator('section[aria-labelledby=text] [dir=rtl]').count()) === 1, 'Arabic is written right to left');
  await page.fill('input[name=ar-tagline]', 'الحياة الحلوة الجديدة');
  await page.getByRole('tab', { name: 'English' }).first().click();
  for (const [label, value] of [['Engine', '3.9 L twin-turbo V8'], ['Power', '620 PS at 7,500 rpm']]) {
    await page.click('button:has-text("Add a spec")');
    const row = page.locator('section[aria-labelledby=specs] li').last();
    await row.locator('input').nth(0).fill(label);
    await row.locator('input').nth(1).fill(value);
  }
  check((await text(page, 'aside')).includes('Unsaved changes'), 'unsaved changes are shown');
  await page.click('button:has-text("Create the car")');
  await alert(page).waitFor();
  check((await alert(page).innerText()).includes('17 letters'), 'a wrong VIN is refused with what a VIN looks like');
  await page.fill('input[name=vin]', 'ZFF98RNA0P0123456');
  await page.click('button:has-text("Create the car")');
  await page.waitForURL(/\/admin\/inventory\/[0-9a-f-]{36}\?saved=1$/);
  const id = page.url().match(/inventory\/([0-9a-f-]{36})/)![1];
  const [roma] = await q(`select slug, publication, status, mileage_km, price::text, vin from public.vehicles where id = $1`, [id]);
  check(roma.slug === 'ferrari-roma-2023' && roma.publication === 'draft' && roma.status === 'available' && roma.mileage_km === 4200 && roma.price === '245000.00',
    'the car is created as a draft with its details', roma);
  const tr = await q(`select locale, tagline from public.vehicle_translations where vehicle_id = $1 order by locale`, [id]);
  check(tr.length === 2 && tr[1].tagline === 'الحياة الحلوة الجديدة', 'its English and Arabic text are saved; the empty French is not', tr);
  check((await q(`select count(*)::int n from public.vehicle_features where vehicle_id = $1`, [id]))[0].n === 2, 'its two specs are saved');
  check((await text(page)).includes('Created. Add its photos'), 'the page says what to do next');

  /* ---------------------------------------------------------- photos and a video */
  const input = page.locator(`#upload-${id}`);
  await input.setInputFiles([await photo(page, 210), await photo(page, 20)]);
  await page.locator('section[aria-labelledby=media]').getByText('2 added').waitFor({ timeout: 60000 });
  await input.setInputFiles([video]);
  await page.locator('section[aria-labelledby=media]').getByText(/^Added\./).waitFor({ timeout: 120000 });
  const media = await q(`select kind, storage_bucket, storage_path, poster_path, width, height, duration_seconds from public.vehicle_media where vehicle_id = $1 order by sort_order`, [id]);
  check(media.length === 3 && media.map(m => m.kind).join() === 'image,image,video' && media.every(m => m.storage_bucket === 'media' && m.storage_path.startsWith(`vehicles/${id}/`)),
    'two photos and a video are on the car, in the car’s folder', media);
  check(media[0].width === 1500 && media[0].height === 1000, 'a photo is resized to the website’s 1500 px', media[0]);
  const served = async (path: string) => (await fetch(`${SUPABASE}/storage/v1/object/public/media/${path}`)).status;
  check(await served(media[0].storage_path) === 200 && await served(media[0].storage_path.replace('.webp', '-800.webp')) === 200, 'each photo has its 800 px copy beside it');
  check(!!media[2].poster_path && await served(media[2].poster_path) === 200 && Number(media[2].duration_seconds) > 0, 'the video has a still and its length', media[2]);
  check(((await page.locator('section[aria-labelledby=media] li').first().textContent()) ?? '').includes('Main picture'), 'the first photo is marked as the main picture');
  await page.locator('section[aria-labelledby=media] li').nth(1).locator('button:has-text("Make main")').click();
  await page.locator('section[aria-labelledby=media]').getByText('Order saved.').waitFor();
  const order = await q(`select storage_path from public.vehicle_media where vehicle_id = $1 order by sort_order`, [id]);
  check(order[0].storage_path === media[1].storage_path, 'another photo can be made the main picture');
  const firstAlt = page.locator('section[aria-labelledby=media] li').first().locator('input');
  await firstAlt.fill('Blu Pozzi Ferrari Roma, front three-quarter');
  await firstAlt.blur();
  await page.locator('section[aria-labelledby=media]').getByText('Description saved.').waitFor();
  check((await q(`select alt from public.vehicle_media where storage_path = $1`, [media[1].storage_path]))[0].alt.en === 'Blu Pozzi Ferrari Roma, front three-quarter', 'a photo’s description is saved');
  await page.locator('#upload-' + id).setInputFiles([{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }]);
  await page.locator('section[aria-labelledby=media] [role=alert]').waitFor();
  check((await page.locator('section[aria-labelledby=media] [role=alert]').innerText()).includes('JPEG, PNG, WebP or AVIF'), 'a file that isn’t a photo or video is refused');

  /* ---------------------------------------------------------- on the website */
  await page.goto(APP + '/car/ferrari-roma-2023');
  check(page.url().endsWith('/car/ferrari-roma-2023') && (await text(page)).includes('couldn’t find that car'), 'a draft isn’t on the website');
  await page.goto(APP + `/admin/inventory/${id}`);
  await page.check('input[name=publication][value=published]');
  await page.click('button:has-text("Save changes")');
  await status(page).filter({ hasText: 'Saved.' }).waitFor();
  const car = await open();
  await car.page.goto(APP + '/car/ferrari-roma-2023');
  const ct = await text(car.page);
  check(ct.includes('Roma') && ct.includes('La nuova dolce vita') && ct.includes('$245,000') && ct.includes('3.9 L twin-turbo V8') && ct.includes('One owner from new'),
    'published, the car’s page shows its details, text and specs');
  check(!!(await car.page.locator('.gallery-main img').getAttribute('src'))?.includes(media[1].storage_path), 'its main picture is the one chosen');
  check(await car.page.locator('.thumbs button').count() === 3 && await car.page.locator('.thumbs button[aria-label="Play video 1"]').count() === 1, 'its gallery has both photos and the video');
  await car.page.click('.thumbs button[aria-label="Play video 1"]');
  check(await car.page.locator('.gallery-main video[controls]').count() === 1, 'the video plays in the gallery, with its controls');
  await shot(car.page, 'car-page-1440');
  await car.page.goto(APP + '/inventory');
  check((await car.page.locator('a.vehicle[href="/car/ferrari-roma-2023"]').count()) === 1, 'and it’s in the website’s inventory');

  /* featured on the home page, then reserved */
  await page.check('label:has-text("Featured on the home page") input');
  await page.fill('input[name=featured_rank]', '1');
  await page.check('input[name=status][value=reserved]');
  await page.click('button:has-text("Save changes")');
  await status(page).filter({ hasText: 'Saved.' }).waitFor();
  await car.page.goto(APP + '/');
  const teaser = car.page.locator('#inventory .teaser-cars a');
  check((await teaser.first().getAttribute('href')) === '/car/ferrari-roma-2023' && (await teaser.first().locator('img').getAttribute('alt')) === 'Blu Pozzi Ferrari Roma, front three-quarter',
    'featured first, it leads the home page’s three cars, with its photo’s description');
  check(await teaser.count() === 3, 'the home page still shows three cars');
  await car.page.goto(APP + '/inventory');
  check((await car.page.locator('a.vehicle[href="/car/ferrari-roma-2023"] .tag.reserved').count()) === 1, 'reserved, it shows the “Reserved” tag');
  await car.ctx.close();
  const h = await q(`select from_status, to_status, from_publication, to_publication from public.vehicle_status_history where vehicle_id = $1 order by changed_at`, [id]);
  check(h.length === 3 && h[2].to_status === 'reserved', 'each change is in the car’s history', h);
  await page.goto(APP + '/admin');
  check((await text(page)).includes('Ferrari Roma') && (await text(page)).includes('Available → Reserved'), 'and among the overview’s latest changes');

  /* ---------------------------------------------------------- the inventory editor’s role */
  const ed = await open();
  await signIn(ed.page, STAFF.editor);
  await ed.page.goto(APP + `/admin/inventory/${id}`);
  check(await ed.page.locator('input[name=status]').first().isDisabled() && (await text(ed.page, 'aside')).includes('Only a manager or the owner can reserve or sell'), 'an inventory editor can’t reserve or sell');
  check(await ed.page.locator('button:has-text("Delete")').count() === 0, 'nor delete a car');
  await ed.page.click('button:has-text("Duplicate as a new draft")');
  await ed.page.waitForURL(/\?copied=1$/);
  const copyId = ed.page.url().match(/inventory\/([0-9a-f-]{36})/)![1];
  const [copy] = await q(`select slug, publication, status, vin, (select count(*)::int from public.vehicle_media where vehicle_id = v.id) photos from public.vehicles v where id = $1`, [copyId]);
  check(copy.slug === 'ferrari-roma-2023-copy' && copy.publication === 'draft' && copy.status === 'available' && copy.vin === null && copy.photos === 0,
    'the editor duplicates it: a draft without photos or VIN', copy);
  await ed.page.fill('input[name=slug]', 'ferrari-roma-2023');
  await ed.page.click('button:has-text("Save changes")');
  await alert(ed.page).waitFor();
  check((await alert(ed.page).innerText()).includes('Another car already uses this address'), 'an address already taken is refused');
  await ed.page.goto(APP + '/admin/brands');
  await ed.page.fill('input[placeholder="e.g. Aston Martin"]', 'Aston Martin');
  await ed.page.click('button:has-text("Add the brand")');
  await ed.page.getByText('Brand added.').waitFor();
  check((await q(`select slug from public.brands where name = 'Aston Martin'`))[0]?.slug === 'aston-martin', 'the editor adds a brand');
  check(!(await text(ed.page)).includes('Delete…'), 'but can’t delete brands');
  await ed.ctx.close();

  /* ---------------------------------------------------------- a salesperson only looks */
  const sales = await open('phone');
  await signIn(sales.page, STAFF.sales);
  await sales.page.goto(APP + '/admin/inventory');
  check(!(await text(sales.page)).includes('Add a car') && await sales.page.locator('main button:has-text("↑")').count() === 0, 'a salesperson sees the cars, without adding or ordering them');
  await sales.page.goto(APP + `/admin/inventory/${id}`);
  check(await sales.page.locator('input[name=model]').isDisabled() && await sales.page.locator('button:has-text("Save changes")').count() === 0, 'and sees a car’s details without changing them');
  await sales.page.goto(APP + '/admin/inventory/new');
  check(sales.page.url() === APP + '/admin/inventory', 'and can’t open “Add a car”');
  check(await sales.page.locator('nav a[href="/admin/brands"]').count() === 0, 'Brands isn’t in a salesperson’s menu');
  await sales.ctx.close();

  /* ---------------------------------------------------------- removing */
  await page.goto(APP + `/admin/inventory/${id}`);
  const videoPath = media[2].storage_path, posterPath = media[2].poster_path;
  await page.locator('section[aria-labelledby=media] li').nth(2).locator('button:has-text("Remove…")').click();
  await page.locator('section[aria-labelledby=media] li').nth(2).locator('button:has-text("Remove for good")').click();
  await page.locator('section[aria-labelledby=media]').getByText('Removed.').waitFor();
  check(await served(videoPath) === 404 && await served(posterPath) === 404 && (await q(`select count(*)::int n from public.vehicle_media where vehicle_id = $1`, [id]))[0].n === 2,
    'removing the video removes its file and its still');
  await page.goto(APP + `/admin/inventory/${copyId}`);
  await page.click('button:has-text("Delete…")');
  await page.click('button:has-text("Delete for good")');
  await page.waitForURL(APP + '/admin/inventory?deleted=1');
  check((await q(`select count(*)::int n from public.vehicles where id = $1`, [copyId]))[0].n === 0, 'the owner deletes the copy');
  await page.goto(APP + `/admin/inventory/${id}`);
  await page.click('button:has-text("Delete…")');
  await page.click('button:has-text("Delete for good")');
  await page.waitForURL(APP + '/admin/inventory?deleted=1');
  check(await served(media[0].storage_path) === 404 && await served(media[1].storage_path.replace('.webp', '-800.webp')) === 404, 'deleting a car removes its photos’ files too');

  /* ---------------------------------------------------------- brands, legacy cars, phones */
  await page.goto(APP + '/admin/brands');
  const aston = page.locator('main ol > li', { hasText: 'Aston Martin' });
  await aston.locator('button:has-text("Edit")').click();
  await aston.locator('textarea').fill('British grand tourers since 1913.');
  await aston.locator('button:has-text("Save")').click();
  await page.getByText('Saved.').waitFor();
  check((await q(`select description from public.brands where slug = 'aston-martin'`))[0].description.en === 'British grand tourers since 1913.', 'a brand’s words are saved');
  await aston.locator('button:has-text("Delete…")').click();
  await aston.locator('button:has-text("Delete for good")').click();
  await page.getByText('Brand deleted.').waitFor();
  check((await q(`select count(*)::int n from public.brands where slug = 'aston-martin'`))[0].n === 0, 'a brand without cars is deleted by the owner');
  const ferrari = page.locator('main ol > li', { hasText: 'Ferrari' }).first();
  await ferrari.locator('button:has-text("Edit")').click();
  check((await ferrari.innerText()).includes('A brand with cars can’t be deleted'), 'a brand with cars can’t be');
  const f8 = (await q(`select id from public.vehicles where slug = 'f8-tributo'`))[0].id;
  await page.goto(APP + `/admin/inventory/${f8}`);
  check((await text(page)).includes('also lives in the current website’s admin page'), 'a car from the current admin page says that changes there replace these');
  await shot(page, 'editor-1440');
  await ctx.close();
  const phone = await open('phone');
  await signIn(phone.page, STAFF.manager);
  await phone.page.goto(APP + `/admin/inventory/${f8}`);
  check(await noSideScroll(phone.page), 'the editor fits a phone');
  await shot(phone.page, 'editor-375');
  await phone.page.goto(APP + '/admin/inventory');
  check(await noSideScroll(phone.page), 'the inventory fits a phone');
  await shot(phone.page, 'inventory-375');
  await phone.ctx.close();
} catch (e) {
  check(false, 'the run stopped: ' + (e as Error).message);
}
await finish(() => server.close());
