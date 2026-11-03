/* The showroom admin: log in, see every car, add and edit cars, upload photos.
   It talks to Supabase directly; the database rules in supabase/setup.sql decide what this login may do. */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_KEY_OK, SUPABASE_URL } from '../config';
import { asset } from '../data/images';

(() => {
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const BUCKET = 'car-photos';
const STATUSES = { available: 'Available', reserved: 'Reserved', sold: 'Sold' };
const NEW_SPECS = ['Engine', 'Power', 'Torque', 'Gearbox', 'Drive', '0 to 100 km/h', 'Top speed'];
const NAME = c => c.make + ' ' + c.model;
/* the display face draws 1 and 0 like I and O, so digits in car names use the body face, as on the public pages */
const named = (e, text) => { e.textContent = ''; text.split(/(\d+)/).forEach((part, n) => { if (part) e.append(n % 2 ? el('span', 'num', part) : part); }); return e; };
const money = n => n == null ? 'Price on request' : '$' + Number(n).toLocaleString('en-US');
/* every photo has a smaller copy beside it for lists and phones: svj.webp and svj-800.webp */
const small = src => src.replace(/\.(webp|jpe?g|png|avif)$/i, '-800.$1');
/* site photos are found through the build's picture list; uploaded photos are full web addresses */
const pic = (src, alt) => { const img = el('img'); img.alt = alt; img.decoding = 'async'; img.src = asset(small(src)); img.onerror = () => { img.onerror = null; img.src = asset(src); }; return img; };

const views = ['wait', 'offline', 'login', 'notAdmin', 'list', 'edit'];
function show(id) {
  views.forEach(v => { $('#' + v).hidden = v !== id; });
  $$('.when-in').forEach(e => { e.hidden = !['list', 'edit', 'notAdmin'].includes(id); });
  window.scrollTo(0, 0);
}
let toastT = 0;
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), bad ? 7000 : 3500);
}
/* plain words for what went wrong */
function why(e) {
  const m = (e && (e.message || e.error_description)) || String(e || '');
  if (/fetch|network|load failed/i.test(m)) return 'Couldn’t reach Supabase. Check your connection and try again.';
  if (e && e.code === '23505') return 'Another car already uses this web address name. Change it and save again.';
  if ((e && e.code === 'PGRST116') || /row-level security|permission denied|unauthorized|jwt/i.test(m)) return 'This login isn’t allowed to do that. Log out, log in again and retry.';
  if (/payload too large|maximum allowed size/i.test(m)) return 'That photo is too big. Photos can be up to 10 MB.';
  return m || 'Something went wrong. Try again.';
}
function busy(btn, on, text) {
  if (on) { btn.dataset.idle = btn.textContent; btn.textContent = text; btn.disabled = true; }
  else { btn.textContent = btn.dataset.idle || btn.textContent; btn.disabled = false; }
}
const iconBtn = (sym, label, fn, off) => {
  const b = el('button', 'a-icon', sym); b.type = 'button'; b.title = label; b.disabled = !!off;
  b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b;
};
$$('[data-reload]').forEach(b => b.addEventListener('click', () => location.reload()));

/* the wrong kind of key: say so instead of a blank page */
if (!SUPABASE_KEY_OK) { show('offline'); return; }
/* the login is kept under its own name, so the public pages never read it */
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'milcar-admin' } });
const PUBLIC = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/';

let me = null, cars = [], filter = 'all', editing = null;

/* ---------- logging in and out ---------- */
async function enter(session) {
  if (!session) { me = null; show('login'); return; }
  me = session.user;
  try {
    const { data, error } = await db.rpc('is_admin');
    if (error) throw error;
    if (data !== true) { $('#notAdminEmail').textContent = me.email; show('notAdmin'); return; }
    await loadCars();
  } catch (e) { show('offline'); return; }
  route();
}
db.auth.getSession().then(({ data }) => enter(data.session), () => show('offline'));
/* a login that ran out (or was ended elsewhere) goes back to the login screen */
db.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT' && me) { me = null; editing = null; show('login'); } });

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button'), err = $('#loginError');
  const email = f.email.value.trim(), password = f.password.value;
  err.hidden = true;
  if (!email || !password) { err.textContent = 'Enter your email and password.'; err.hidden = false; return; }
  busy(btn, true, 'Logging in…');
  let res;
  try { res = await db.auth.signInWithPassword({ email, password }); } catch (x) { res = { error: x }; }
  busy(btn, false);
  if (res.error) {
    err.textContent = /invalid login|invalid credentials/i.test(res.error.message || '') ? 'That email and password don’t match. Try again.' : why(res.error);
    err.hidden = false; return;
  }
  f.password.value = '';
  enter(res.data.session);
});
async function logout() {
  if (editing && editing.dirty && !confirm('Log out without saving your changes?')) return;
  if (editing) dropUploads();
  editing = null; me = null;
  await db.auth.signOut({ scope: 'local' }).catch(() => {});
  history.replaceState(null, '', location.pathname);
  show('login');
}
$('#logout').addEventListener('click', logout);
$$('[data-logout]').forEach(b => b.addEventListener('click', logout));

/* ---------- pages inside the admin: #list, #new, #edit/<id> ---------- */
let restoring = false;
function route() {
  if (!me) return;
  const h = location.hash;
  if (editing && h !== editing.hash) { dropUploads(); editing = null; }
  if (h === '#new') openEdit(null);
  else if (h.startsWith('#edit/')) {
    const c = cars.find(x => x.id === decodeURIComponent(h.slice(6)));
    if (c) openEdit(c); else location.replace('#list');
  } else { renderList(); show('list'); }
}
addEventListener('hashchange', () => {
  if (restoring) { restoring = false; return; }
  if (editing && editing.dirty && location.hash !== editing.hash && !confirm('Leave without saving your changes?')) {
    restoring = true; location.hash = editing.hash; return;
  }
  route();
});
addEventListener('beforeunload', e => { if (editing && editing.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- the list ---------- */
async function loadCars() {
  const { data, error } = await db.from('cars').select('*').order('sort_order').order('created_at');
  if (error) throw error;
  cars = data;
}
const byOrder = (a, b) => a.sort_order - b.sort_order || String(a.created_at).localeCompare(String(b.created_at));

function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const counts = { all: cars.length, available: 0, reserved: 0, sold: 0 };
  cars.forEach(c => { counts[c.status]++; });
  $$('#statusFilter button').forEach(b => {
    b.querySelector('i').textContent = counts[b.dataset.status];
    b.setAttribute('aria-pressed', String(b.dataset.status === filter));
  });
  const shown = cars.filter(c => (filter === 'all' || c.status === filter) &&
    (!q || [c.make, c.model, c.id, c.type, c.tagline, c.color, c.year].join(' ').toLowerCase().includes(q)));
  const ul = $('#cars');
  ul.textContent = '';
  shown.forEach(c => ul.append(carRow(c)));
  const empty = $('#empty');
  empty.hidden = shown.length > 0;
  empty.textContent = cars.length ? 'No cars match.' : 'No cars yet. Add your first one.';
}
function carRow(c) {
  const li = el('li', 'a-car s-' + c.status); li.dataset.id = c.id;
  const a = el('a', 'a-car-main'); a.href = '#edit/' + encodeURIComponent(c.id);
  const fig = el('figure');
  fig.append(c.images[0] ? pic(c.images[0], '') : el('span', 'a-nophoto', 'No photo'));
  const txt = el('div', 'a-car-text');
  txt.append(el('p', 'label', c.make + (c.sample ? ' · Sample' : '')), named(el('h2'), c.model),
    el('p', 'a-meta', [c.type, c.year, money(c.price)].filter(Boolean).join(' · ')));
  a.append(fig, txt);
  li.append(a, statusGroup(c));
  return li;
}
function statusGroup(c) {
  const g = el('div', 'a-status');
  g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Status of ' + NAME(c));
  Object.entries(STATUSES).forEach(([s, label]) => {
    const b = el('button', '', label); b.type = 'button'; b.dataset.status = s;
    b.setAttribute('aria-pressed', String(c.status === s));
    b.addEventListener('click', () => setStatus(c, s));
    g.append(b);
  });
  return g;
}
/* the quick buttons: one tap changes the car on the website */
async function setStatus(c, s) {
  if (c.status === s) return;
  const was = c.status;
  c.status = s; renderList(); refocus(c.id, s);
  const { data, error } = await db.from('cars').update({ status: s }).eq('id', c.id).select('id');
  if (error || !data || !data.length) {
    c.status = was; renderList(); refocus(c.id, was);
    toast(error ? why(error) : 'This login isn’t allowed to change cars.', true); return;
  }
  toast(NAME(c) + (s === 'sold' ? ' is sold and now hidden from the website.' : s === 'reserved' ? ' shows as reserved.' : ' is available again.'));
}
function refocus(id, s) {
  const b = $$('.a-car').find(li => li.dataset.id === id);
  if (b && document.activeElement && document.activeElement.closest('.a-status')) { const x = b.querySelector('[data-status="' + s + '"]'); if (x) x.focus(); }
}
$('#search').addEventListener('input', renderList);
$$('#statusFilter button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.status; renderList(); }));

/* ---------- adding and editing ---------- */
const form = $('#carForm');
/* fields by name (form.id would be the form's own id, not the field) */
const F = new Proxy({}, { get: (_, k) => form.elements.namedItem(k) });
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/* numbers people type in their own way: "245,000", "$245000", "12 400 km" */
const whole = s => { const t = s.replace(/[\s,$]|usd|km/gi, ''); return t === '' ? null : /^\d+$/.test(t) ? +t : NaN; };
const TEXT = ['make', 'model', 'id', 'tagline', 'credit', 'color', 'service_records', 'import_papers'];
const NUMS = ['price', 'sort_order', 'year', 'mileage_km', 'previous_owners'];

function openEdit(c) {
  const isNew = !c;
  const car = c || { type: 'Supercars', status: 'available', images: [], specs: NEW_SPECS.map(label => ({ label, value: '' })),
    sort_order: Math.max(0, ...cars.map(x => x.sort_order)) + 10 };
  editing = { isNew, original: c, hash: location.hash, images: [...(car.images || [])], uploaded: new Set(), pending: [], uploading: 0, status: car.status, dirty: false, idTouched: !isNew };
  TEXT.forEach(k => { F[k].value = car[k] || ''; });
  NUMS.forEach(k => { F[k].value = car[k] == null ? '' : car[k]; });
  if (c && c.price != null) F.price.value = Number(c.price).toLocaleString('en-US');
  if (c && c.mileage_km != null) F.mileage_km.value = Number(c.mileage_km).toLocaleString('en-US');
  F.type.value = car.type;
  F.sample.checked = !!car.sample;
  F.id.readOnly = !isNew;
  $('#idHint').textContent = isNew ? 'Made from the make and model. Only lowercase letters, numbers and dashes.' : 'The car’s page is /car/' + c.id + '. It can’t change once the car is added.';
  $('#editLabel').textContent = isNew ? 'Add a car' : 'Edit car';
  named($('#editTitle'), isNew ? 'New car' : NAME(c));
  $('#dangerZone').hidden = isNew;
  $('#formError').hidden = true;
  pickStatus(car.status);
  showPrice();
  renderSpecs(car.specs || []);
  renderPhotos();
  lockSave();
  show('edit');
}
form.addEventListener('input', e => {
  if (!editing) return;
  editing.dirty = true;
  if (e.target === F.id) editing.idTouched = true;
  if ((e.target === F.make || e.target === F.model) && editing.isNew && !editing.idTouched) F.id.value = slugify(F.make.value + ' ' + F.model.value);
  if (e.target === F.price) showPrice();
});
function showPrice() {
  const p = whole(F.price.value);
  $('#priceShow').textContent = p == null ? 'The website shows “Price on request”.' : Number.isNaN(p) || p < 1 ? 'Use numbers only, like 245000.' : 'The website shows ' + money(p) + '.';
}
function pickStatus(s) {
  editing.status = s;
  $$('#statusPick button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.status === s)));
}
$$('#statusPick button').forEach(b => b.addEventListener('click', () => { pickStatus(b.dataset.status); editing.dirty = true; }));

/* factory specs: label and value rows, in the order they are shown */
function specRow(label, value) {
  const li = el('li', 'a-spec');
  const l = el('input', 'a-spec-label'); l.value = label || ''; l.placeholder = 'Name, like Engine'; l.setAttribute('aria-label', 'Spec name'); l.autocomplete = 'off';
  const v = el('input'); v.value = value || ''; v.placeholder = 'Value, like 3.9 L twin-turbo V8'; v.setAttribute('aria-label', 'Spec value'); v.autocomplete = 'off';
  const tools = el('div', 'a-row-tools');
  tools.append(
    iconBtn('↑', 'Move up', () => { if (li.previousElementSibling) { li.previousElementSibling.before(li); editing.dirty = true; } }),
    iconBtn('↓', 'Move down', () => { if (li.nextElementSibling) { li.nextElementSibling.after(li); editing.dirty = true; } }),
    iconBtn('×', 'Remove this spec', () => { li.remove(); editing.dirty = true; }));
  li.append(l, v, tools);
  return li;
}
function renderSpecs(list) {
  const ol = $('#specs');
  ol.textContent = '';
  list.forEach(s => ol.append(specRow(s.label, s.value)));
}
$('#addSpec').addEventListener('click', () => { const r = specRow(); $('#specs').append(r); r.querySelector('input').focus(); editing.dirty = true; });
const readSpecs = () => $$('#specs li').map(li => { const [l, v] = li.querySelectorAll('input'); return { label: l.value.trim(), value: v.value.trim() }; }).filter(s => s.value);

/* ---------- photos ---------- */
function renderPhotos() {
  const ol = $('#photos'), n = editing.images.length;
  ol.textContent = '';
  editing.images.forEach((src, i) => {
    const li = el('li', 'a-photo');
    li.append(pic(src, 'Photo ' + (i + 1)));
    if (i === 0) li.append(el('span', 'tag a-main', 'Main photo'));
    const tools = el('div', 'a-row-tools');
    tools.append(
      iconBtn('←', 'Move photo ' + (i + 1) + ' earlier', () => movePhoto(i, -1), i === 0),
      iconBtn('→', 'Move photo ' + (i + 1) + ' later', () => movePhoto(i, 1), i === n - 1),
      iconBtn('×', 'Remove photo ' + (i + 1), () => { editing.images.splice(i, 1); editing.dirty = true; renderPhotos(); }));
    li.append(tools);
    ol.append(li);
  });
  editing.pending.forEach(p => ol.append(p));
}
function movePhoto(i, d) {
  const a = editing.images;
  [a[i], a[i + d]] = [a[i + d], a[i]];
  editing.dirty = true;
  renderPhotos();
  const b = $$('#photos .a-photo')[i + d];
  if (b) b.querySelector(d < 0 ? '.a-icon' : '.a-icon:nth-child(2)').focus();
}
function lockSave() {
  const b = $('#saveCar');
  if (editing.uploading) { if (!b.disabled) busy(b, true, 'Uploading photos…'); } else if (b.disabled) busy(b, false);
}
$('#photoInput').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length || !editing) return;
  const ed = editing;
  ed.dirty = true;
  const jobs = files.map(f => {
    const li = el('li', 'a-photo a-pending'), note = el('span', 'a-progress', 'Waiting…'), img = el('img');
    img.alt = ''; img.src = URL.createObjectURL(f); img.onerror = () => { img.remove(); };
    li.append(img, note);
    ed.pending.push(li);
    return { f, li, img, note };
  });
  ed.uploading++; lockSave();
  renderPhotos();
  /* one at a time, so a phone never holds several big photos in memory */
  for (const j of jobs) {
    try {
      const url = await uploadPhoto(j.f, slugify(F.id.value || F.model.value) || 'car', t => { j.note.textContent = t; });
      if (editing !== ed) { removeFiles([url]); continue; }
      ed.images.push(url); ed.uploaded.add(url);
      ed.pending.splice(ed.pending.indexOf(j.li), 1);
      renderPhotos();
    } catch (x) {
      j.li.classList.add('a-failed');
      j.note.textContent = x.friendly || why(x);
      const tools = el('div', 'a-row-tools');
      tools.append(iconBtn('×', 'Remove this failed photo', () => { ed.pending.splice(ed.pending.indexOf(j.li), 1); j.li.remove(); }));
      j.li.append(tools);
    } finally { URL.revokeObjectURL(j.img.src); }
  }
  ed.uploading--;
  if (editing === ed) lockSave();
});
/* a phone photo becomes a sharp 1500 px picture plus an 800 px copy for lists and phones */
async function uploadPhoto(file, folder, say) {
  say('Preparing…');
  const src = await decode(file);
  let big, little;
  try { big = await shrink(src.img, 1500); little = await shrink(src.img, 800); } finally { src.free(); }
  const ext = big.type === 'image/webp' ? 'webp' : 'jpg';
  const base = folder + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const put = (path, blob) => db.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }).then(({ error }) => { if (error) throw error; });
  say('Uploading…');
  await put(base + '.' + ext, big);
  try { await put(base + '-800.' + ext, little); } catch (x) { removeFiles([PUBLIC + base + '.' + ext]); throw x; }
  return db.storage.from(BUCKET).getPublicUrl(base + '.' + ext).data.publicUrl;
}
async function decode(file) {
  const unreadable = () => Object.assign(new Error('unreadable'), { friendly: 'Can’t read this photo. Use a JPG, PNG or WebP.' });
  if (window.createImageBitmap) {
    try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { img: b, free: () => b.close && b.close() }; } catch (x) { /* try the slower way */ }
  }
  const url = URL.createObjectURL(file), img = new Image();
  img.src = url;
  try { await img.decode(); } catch (x) { URL.revokeObjectURL(url); throw unreadable(); }
  return { img, free: () => URL.revokeObjectURL(url) };
}
function shrink(img, maxW) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const k = Math.min(1, maxW / w, maxW * 1.5 / h);
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  /* WebP where the browser can make it, JPEG otherwise (older iPhones) */
  return new Promise((ok, no) => c.toBlob(b => {
    if (b && b.type === 'image/webp') return ok(b);
    c.toBlob(j => j ? ok(j) : no(new Error('Couldn’t prepare this photo.')), 'image/jpeg', .86);
  }, 'image/webp', .86));
}
/* uploaded photos (never the site's own files) and their small copies */
function removeFiles(urls) {
  const paths = urls.filter(u => u && u.startsWith(PUBLIC)).flatMap(u => { const p = decodeURIComponent(u.slice(PUBLIC.length)); return [p, small(p)]; });
  if (paths.length) return db.storage.from(BUCKET).remove(paths).catch(() => {});
}
/* photos uploaded while editing, then abandoned */
function dropUploads() { if (editing && editing.uploaded.size) removeFiles([...editing.uploaded]); }

/* ---------- saving ---------- */
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!editing || editing.uploading) return;
  const err = $('#formError'), btn = $('#saveCar'), ed = editing;
  const v = k => F[k].value.trim();
  const fail = (msg, field) => { err.textContent = msg; err.hidden = false; if (field) field.focus(); };
  err.hidden = true;
  const row = {
    make: v('make'), model: v('model'), type: F.type.value, tagline: v('tagline') || null,
    images: ed.images, credit: v('credit') || null, specs: readSpecs(),
    year: whole(v('year')), mileage_km: whole(v('mileage_km')), color: v('color') || null, previous_owners: whole(v('previous_owners')),
    service_records: v('service_records') || null, import_papers: v('import_papers') || null,
    price: whole(v('price')), status: ed.status, sample: F.sample.checked, sort_order: whole(v('sort_order')) ?? 0
  };
  if (!row.make) return fail('Enter the make, like Ferrari.', F.make);
  if (!row.model) return fail('Enter the model, like F8 Tributo.', F.model);
  if (ed.isNew) {
    row.id = v('id');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.id)) return fail('The web address name can only have lowercase letters, numbers and single dashes, like f8-tributo.', F.id);
  }
  if (Number.isNaN(row.price) || row.price === 0) return fail('Write the price in US dollars with numbers only, like 245000, or leave it empty.', F.price);
  if (row.year != null && (Number.isNaN(row.year) || row.year < 1900 || row.year > 2100)) return fail('The year should be between 1900 and 2100.', F.year);
  if (Number.isNaN(row.mileage_km)) return fail('Write the mileage with numbers only, like 12400.', F.mileage_km);
  if (Number.isNaN(row.previous_owners)) return fail('Previous owners should be a number, like 1.', F.previous_owners);
  if (Number.isNaN(row.sort_order)) return fail('The position should be a whole number, like 70.', F.sort_order);
  if (row.specs.some(s => !s.label)) return fail('Every spec needs a name, like Engine.', $$('#specs .a-spec-label').find(i => !i.value.trim() && i.nextElementSibling.value.trim()));

  busy(btn, true, 'Saving…');
  let res;
  try {
    res = ed.isNew ? await db.from('cars').insert(row).select().single()
                   : await db.from('cars').update(row).eq('id', ed.original.id).select().single();
  } catch (x) { res = { error: x }; }
  busy(btn, false);
  if (res.error) return fail('Not saved. ' + why(res.error));

  /* tidy the photo folder: uploaded photos that are no longer used */
  removeFiles([...(ed.original ? ed.original.images : []), ...ed.uploaded].filter(u => !row.images.includes(u)));
  cars = cars.filter(c => c.id !== res.data.id).concat(res.data).sort(byOrder);
  editing = null;
  toast(ed.isNew ? NAME(res.data) + ' is added.' + (res.data.status === 'sold' ? '' : ' It’s on the website now.') : NAME(res.data) + ' is saved.');
  location.hash = '#list';
});

/* ---------- deleting, after a clear question ---------- */
const dialog = $('#confirmDelete');
$('#deleteCar').addEventListener('click', () => {
  if (!editing || !editing.original) return;
  const c = editing.original;
  named($('#confirmTitle'), 'Delete the ' + NAME(c) + '?');
  if (dialog.showModal) { dialog.returnValue = ''; dialog.showModal(); }
  else if (confirm('Delete the ' + NAME(c) + '? This can’t be undone.')) removeCar();
});
dialog.addEventListener('close', () => { if (dialog.returnValue === 'delete') removeCar(); });
async function removeCar() {
  if (!editing || !editing.original) return;
  const ed = editing, c = ed.original;
  let res;
  try { res = await db.from('cars').delete().eq('id', c.id).select('id'); } catch (x) { res = { error: x }; }
  if (res.error || !res.data || !res.data.length) { toast('Not deleted. ' + (res.error ? why(res.error) : 'This login isn’t allowed to delete cars.'), true); return; }
  removeFiles([...c.images, ...ed.uploaded]);
  cars = cars.filter(x => x.id !== c.id);
  editing = null;
  toast('The ' + NAME(c) + ' is deleted.');
  location.hash = '#list';
}
})();
