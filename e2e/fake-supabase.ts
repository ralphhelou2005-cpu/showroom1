/* A stand-in for Supabase on this computer, for testing the dashboard end to end without touching the live project.
   - The database is the in-memory Postgres of the database tests (supabase/tests/db.ts): every migration, today's
     7 cars, and the test staff of e2e/fixtures/staff.json. Every request runs as its caller, so the real access
     rules decide what each person sees and may change.
   - /auth/v1 answers like Supabase Auth for what the platform uses: password sign-in, refreshing and signing out,
     the user, one-time links (invitations, password resets) and the admin calls the server makes with its key.
   - /rest/v1 answers like Supabase's data API for plain table reads, counts, inserts, updates, deletes and
     functions (no nested selects).
   - GET /__outbox lists the emails Auth would have sent (password resets), so a test can follow the link.
   Start: node e2e/fake-supabase.ts [port]   (default 54321) */
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite, Transaction } from '@electric-sql/pglite';
import { createDb, U } from '../supabase/tests/db.ts';

export const KEYS = { publishable: 'sb_publishable_e2e_local_only', secret: 'sb_secret_e2e_local_only' };
const JWT_SECRET = 'e2e-local-only-jwt-secret-not-used-anywhere-else';
const STAFF: Record<string, { email: string; password: string }> = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/staff.json'), 'utf8'));

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const hashPassword = (pw: string) => 'e2e$' + sha('e2e-salt:' + pw);

function sign(claims: Record<string, unknown>) {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(claims));
  return `${head}.${body}.${createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
}
function verify(token: string): Record<string, any> | null {
  const [head, body, sig] = token.split('.');
  if (!sig || createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url') !== sig) return null;
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  return claims.exp * 1000 > Date.now() ? claims : null;
}

/* ---------------------------------------------------------------- the database */

let db: PGlite;
let queue: Promise<unknown> = Promise.resolve();
/* PGlite has one connection: requests take turns */
const serial = <T>(f: () => Promise<T>): Promise<T> => { const p = queue.then(f, f); queue = p.catch(() => {}); return p; };

type Caller = { role: 'anon' | 'authenticated' | 'service_role'; claims: Record<string, any> };
async function asCaller<T>(c: Caller, f: (tx: Transaction) => Promise<T>): Promise<T> {
  return serial(() => db.transaction(async tx => {
    await tx.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('role', $3, true)`,
      [JSON.stringify(c.claims), c.claims.sub ?? '', c.role]);
    return f(tx);
  }));
}
const sql = async (q: string, p: unknown[] = []) => serial(() => db.query<any>(q, p));

/* ---------------------------------------------------------------- Auth */

const sessions = new Map<string, string>();                                     // refresh token -> user id
const links = new Map<string, { userId: string; type: string; until: number }>(); // hashed token -> one-time link
export const outbox: { to: string; type: string; link: string; at: string }[] = [];

async function userRow(where: string, p: unknown[]) {
  return (await sql(`select id, email, encrypted_password, email_confirmed_at, last_sign_in_at, banned_until,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at from auth.users where ${where}`, p)).rows[0];
}
function userJson(u: any) {
  return {
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, phone: '',
    email_confirmed_at: u.email_confirmed_at, confirmed_at: u.email_confirmed_at, last_sign_in_at: u.last_sign_in_at,
    app_metadata: { provider: 'email', providers: ['email'], ...(u.raw_app_meta_data ?? {}) },
    user_metadata: u.raw_user_meta_data ?? {}, identities: [], created_at: u.created_at, updated_at: u.updated_at, is_anonymous: false,
  };
}
async function startSession(u: any) {
  await sql(`update auth.users set last_sign_in_at = now() where id = $1`, [u.id]);
  const fresh = await userRow('id = $1', [u.id]);
  const now = Math.floor(Date.now() / 1000), refresh = randomBytes(24).toString('hex');
  sessions.set(refresh, u.id);
  const claims = { sub: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, iat: now, exp: now + 3600, session_id: randomUUID(),
    aal: 'aal1', is_anonymous: false, app_metadata: userJson(fresh).app_metadata, user_metadata: fresh.raw_user_meta_data ?? {} };
  return { access_token: sign(claims), token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: refresh, user: userJson(fresh) };
}
const banned = (u: any) => u.banned_until && new Date(u.banned_until) > new Date();

class AuthError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
const fail = (status: number, code: string, message: string): never => { throw new AuthError(status, code, message); };

function newLink(userId: string, type: string) {
  const token = randomBytes(20).toString('hex'), hashed = sha(token);
  links.set(hashed, { userId, type, until: Date.now() + 3600_000 });
  return { token, hashed };
}

async function auth(req: IncomingMessage, path: string, url: URL, body: any, bearer: string | null, apikey: string | null) {
  const server = apikey === KEYS.secret || bearer === KEYS.secret;
  const me = async () => {
    const claims = bearer && verify(bearer);
    const u = claims && (await userRow('id = $1', [claims.sub]));
    return u || fail(403, 'bad_jwt', 'invalid JWT');
  };

  if (path === '/token' && url.searchParams.get('grant_type') === 'password') {
    const u = await userRow('lower(email) = lower($1)', [String(body.email ?? '')]);
    if (!u || !u.encrypted_password || u.encrypted_password !== hashPassword(String(body.password ?? ''))) fail(400, 'invalid_credentials', 'Invalid login credentials');
    if (banned(u)) fail(400, 'user_banned', 'User is banned');
    return startSession(u);
  }
  if (path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const id = sessions.get(String(body.refresh_token ?? ''));
    if (!id) fail(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
    sessions.delete(String(body.refresh_token));
    const u = await userRow('id = $1', [id]);
    if (banned(u)) fail(400, 'user_banned', 'User is banned');
    return startSession(u);
  }
  if (path === '/user' && req.method === 'GET') {
    const u = await me();
    if (banned(u)) fail(403, 'user_banned', 'User is banned');
    return userJson(u);
  }
  if (path === '/user' && req.method === 'PUT') {
    const u = await me();
    if (body.password != null) {
      if (String(body.password).length < 6) fail(422, 'weak_password', 'Password should be at least 6 characters.');
      await sql(`update auth.users set encrypted_password = $2, updated_at = now() where id = $1`, [u.id, hashPassword(String(body.password))]);
    }
    if (body.data) await sql(`update auth.users set raw_user_meta_data = raw_user_meta_data || $2::jsonb where id = $1`, [u.id, JSON.stringify(body.data)]);
    return userJson(await userRow('id = $1', [u.id]));
  }
  if (path === '/logout') {
    const claims = bearer && verify(bearer);
    if (claims) for (const [t, id] of sessions) if (id === claims.sub) sessions.delete(t);
    return null;
  }
  if (path === '/recover') {
    const u = await userRow('lower(email) = lower($1)', [String(body.email ?? '')]);
    if (u) {
      const { hashed } = newLink(u.id, 'recovery');
      const to = url.searchParams.get('redirect_to') ?? body.redirect_to ?? '';
      outbox.push({ to: u.email, type: 'recovery', at: new Date().toISOString(), link: `${to}${to.includes('?') ? '&' : '?'}token_hash=${hashed}&type=recovery` });
    }
    return {};
  }
  if (path === '/verify' && req.method === 'POST') {
    const link = links.get(String(body.token_hash ?? ''));
    if (!link || link.until < Date.now() || (link.type !== body.type && !(link.type === 'recovery' && body.type === 'magiclink')))
      fail(403, 'otp_expired', 'Email link is invalid or has expired');
    links.delete(String(body.token_hash));
    await sql(`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1`, [link!.userId]);
    return startSession(await userRow('id = $1', [link!.userId]));
  }

  /* the server's own calls, with its key */
  if (path.startsWith('/admin/')) {
    if (!server) fail(403, 'not_admin', 'User not allowed');
    if (path === '/admin/users' && req.method === 'POST') {
      const email = String(body.email ?? '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, 'validation_failed', 'Unable to validate email address: invalid format');
      if (await userRow('lower(email) = lower($1)', [email])) fail(422, 'email_exists', 'A user with this email address has already been registered');
      const id = randomUUID();
      await sql(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
                 values ($1, $2, $3, $4, $5, $6)`,
        [id, email, body.password ? hashPassword(String(body.password)) : '', body.email_confirm ? new Date().toISOString() : null,
         JSON.stringify(body.app_metadata ?? {}), JSON.stringify(body.user_metadata ?? {})]);
      return userJson(await userRow('id = $1', [id]));
    }
    const one = path.match(/^\/admin\/users\/([0-9a-f-]{36})$/);
    if (one && req.method === 'PUT') {
      const u = (await userRow('id = $1', [one[1]])) || fail(404, 'user_not_found', 'User not found');
      if (body.ban_duration != null) {
        const none = body.ban_duration === 'none';
        await sql(`update auth.users set banned_until = $2 where id = $1`, [u.id, none ? null : new Date(Date.now() + 100 * 365 * 86400_000).toISOString()]);
        if (!none) for (const [t, id] of sessions) if (id === u.id) sessions.delete(t);
      }
      return userJson(await userRow('id = $1', [u.id]));
    }
    if (one && req.method === 'DELETE') {
      await sql(`delete from auth.users where id = $1`, [one[1]]);
      return {};
    }
    if (path === '/admin/generate_link') {
      const u = (await userRow('lower(email) = lower($1)', [String(body.email ?? '')])) || fail(404, 'user_not_found', 'User with this email not found');
      const { token, hashed } = newLink(u.id, String(body.type));
      return { ...userJson(u), action_link: `${url.origin}/auth/v1/verify?token=${token}&type=${body.type}`, email_otp: token.slice(0, 6),
        hashed_token: hashed, redirect_to: body.redirect_to ?? '', verification_type: body.type };
    }
  }
  return fail(404, 'not_found', 'Not found: ' + path);
}

/* ---------------------------------------------------------------- the data API */

const NAME = /^[a-z_][a-z0-9_]*$/;
const ident = (s: string) => { if (!NAME.test(s)) throw new RestError(400, 'PGRST100', 'bad name: ' + s); return '"' + s + '"'; };
class RestError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

function where(url: URL, params: unknown[]) {
  const parts: string[] = [];
  for (const [key, raw] of url.searchParams) {
    if (RESERVED.has(key)) continue;
    const col = ident(key);
    const not = raw.startsWith('not.');
    const v = not ? raw.slice(4) : raw;
    const dot = v.indexOf('.');
    const op = v.slice(0, dot), val = v.slice(dot + 1);
    const p = (x: unknown) => { params.push(x); return '$' + params.length; };
    let c: string;
    if (op === 'is') c = `${col} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : val === 'false' ? 'false' : 'unknown'}`;
    else if (op === 'in') {
      const list = val.replace(/^\(|\)$/g, '').split(',').filter(Boolean).map(s => s.replace(/^"|"$/g, ''));
      c = list.length ? `${col} in (${list.map(p).join(', ')})` : 'false';
    } else {
      const ops: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' };
      if (!ops[op]) throw new RestError(400, 'PGRST100', 'unsupported filter: ' + op);
      c = `${col} ${ops[op]} ${p(op.endsWith('like') ? val.replaceAll('*', '%') : val)}`;
    }
    parts.push(not ? `not (${c})` : c);
  }
  return parts.length ? ' where ' + parts.join(' and ') : '';
}
/* select=id,name,brands!inner(name,slug),vehicle_translations(*): plain columns, and related tables nested the way
   the data API does it, through the foreign keys (one related row as an object, many as a list). The related
   tables are read as the caller too, so their rules apply. !inner keeps only rows that have the related row. */
type Sel = { col?: string; star?: boolean; embed?: { rel: string; alias: string; inner: boolean; items: Sel[] } };
function parseSelect(s: string): Sel[] {
  const out: Sel[] = [];
  let depth = 0, cur = '';
  const push = () => {
    const t = cur.trim(); cur = '';
    if (!t) return;
    const m = t.match(/^(?:([a-z_][a-z0-9_]*):)?([a-z_][a-z0-9_]*)(!inner|!left)?\s*\(([\s\S]*)\)$/);
    if (m) out.push({ embed: { alias: m[1] ?? m[2], rel: m[2], inner: m[3] === '!inner', items: parseSelect(m[4]) } });
    else if (t === '*') out.push({ star: true });
    else out.push({ col: t });
  };
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) push(); else cur += ch;
  }
  push();
  return out;
}
let FKS: { table: string; column: string; ftable: string; fcolumn: string }[] = [];
let aliasCount = 0;
function selectSql(table: string, alias: string, items: Sel[]): { cols: string; inner: string[] } {
  const cols: string[] = [], inner: string[] = [];
  for (const it of items) {
    if (it.star) { cols.push(`${alias}.*`); continue; }
    if (it.col) { cols.push(`${alias}.${ident(it.col)}`); continue; }
    const e = it.embed!, a = 't' + ++aliasCount, rel = ident(e.rel);
    const toOne = FKS.filter(f => f.table === table && f.ftable === e.rel), toMany = FKS.filter(f => f.table === e.rel && f.ftable === table);
    if (toOne.length + toMany.length !== 1) throw new RestError(400, 'PGRST201', `no single relationship between ${table} and ${e.rel}`);
    const sub = selectSql(e.rel, a, e.items);
    const cond = toOne.length ? `${a}.${ident(toOne[0].fcolumn)} = ${alias}.${ident(toOne[0].column)}` : `${a}.${ident(toMany[0].column)} = ${alias}.${ident(toMany[0].fcolumn)}`;
    const from = ` from public.${rel} ${a} where ${[cond, ...sub.inner].join(' and ')}`;
    cols.push(toOne.length
      ? `(select row_to_json(x) from (select ${sub.cols}${from}) x) as ${ident(e.alias)}`
      : `coalesce((select json_agg(x) from (select ${sub.cols}${from}) x), '[]'::json) as ${ident(e.alias)}`);
    if (e.inner) inner.push(`exists (select 1${from})`);
  }
  return { cols: cols.join(', '), inner };
}
/* the plain columns a write hands back */
function columns(url: URL) {
  const s = url.searchParams.get('select') ?? '*';
  if (s === '*') return '*';
  return s.split(',').map(c => c.trim()).filter(Boolean).map(c => { if (/[()!:]/.test(c)) throw new RestError(400, 'PGRST100', 'nested selects are not supported on writes here: ' + c); return ident(c); }).join(', ');
}
function ordering(url: URL) {
  const o = url.searchParams.get('order');
  if (!o) return '';
  return ' order by ' + o.split(',').map(part => {
    const [c, ...mods] = part.split('.');
    return ident(c) + (mods.includes('desc') ? ' desc' : ' asc') + (mods.includes('nullslast') ? ' nulls last' : mods.includes('nullsfirst') ? ' nulls first' : '');
  }).join(', ');
}
const valueOf = (v: unknown) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v === undefined ? null : v);

async function rest(req: IncomingMessage, res: ServerResponse, path: string, url: URL, body: any, caller: Caller) {
  const prefer = String(req.headers.prefer ?? '');
  const single = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  const send = (status: number, data: unknown, headers: Record<string, string> = {}) => {
    if (single && Array.isArray(data)) {
      if (data.length !== 1) throw new RestError(406, 'PGRST116', `JSON object requested, multiple (or no) rows returned`);
      data = data[0];
    }
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(req.method === 'HEAD' || data === undefined ? '' : JSON.stringify(data));
  };

  const rpc = path.match(/^\/rpc\/([a-z_][a-z0-9_]*)$/);
  if (rpc) {
    const fn = (await sql(`select p.proretset, t.typtype, p.proargnames as names, p.proargtypes::regtype[]::text[] as types
                           from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type t on t.oid = p.prorettype
                           where n.nspname = 'public' and p.proname = $1`, [rpc[1]])).rows[0];
    if (!fn) throw new RestError(404, 'PGRST202', 'Could not find the function public.' + rpc[1]);
    /* a list for an array argument becomes a Postgres array; anything else structured stays JSON */
    const typeOf = (k: string) => (fn.types ?? [])[(fn.names ?? []).indexOf(k)] ?? '';
    const pgArray = (a: unknown[]) => '{' + a.map(x => '"' + String(x).replace(/(["\\])/g, '\\$1') + '"').join(',') + '}';
    const args = Object.entries(body ?? {}), params = args.map(([k, v]) => (Array.isArray(v) && typeOf(k).endsWith('[]') ? pgArray(v) : valueOf(v)));
    const call = `public.${ident(rpc[1])}(${args.map(([k], i) => `${ident(k)} => $${i + 1}`).join(', ')})`;
    const rows = await asCaller(caller, tx => tx.query<any>(fn.proretset || fn.typtype === 'c' ? `select * from ${call}` : `select ${call} as r`, params));
    return send(200, fn.proretset || fn.typtype === 'c' ? (fn.proretset ? rows.rows : rows.rows[0]) : rows.rows[0]?.r ?? null);
  }

  const table = ident(path.slice(1));
  const params: unknown[] = [];
  if (req.method === 'GET' || req.method === 'HEAD') {
    const { cols, inner } = selectSql(path.slice(1), 't0', parseSelect(url.searchParams.get('select') ?? '*'));
    let w = where(url, params);
    if (inner.length) w = (w ? w + ' and ' : ' where ') + inner.join(' and ');
    const limit = url.searchParams.get('limit'), offset = url.searchParams.get('offset');
    const page = (limit ? ` limit ${Math.min(+limit, 1000)}` : '') + (offset ? ` offset ${+offset}` : '');
    const { rows, total } = await asCaller(caller, async tx => ({
      rows: req.method === 'HEAD' ? [] : (await tx.query<any>(`select ${cols} from public.${table} t0${w}${ordering(url)}${page}`, params)).rows,
      total: prefer.includes('count=exact') ? Number((await tx.query<any>(`select count(*)::int n from public.${table} t0${w}`, params)).rows[0].n) : null,
    }));
    const headers: Record<string, string> = {};
    if (total != null) headers['content-range'] = `${rows.length ? `0-${rows.length - 1}` : '*'}/${total}`;
    return send(200, rows, headers);
  }
  const returning = prefer.includes('return=representation') ? ` returning ${columns(url)}` : '';
  if (req.method === 'POST') {
    const list = Array.isArray(body) ? body : [body];
    const cols = Object.keys(list[0] ?? {});
    const values = list.map(r => '(' + cols.map(c => { params.push(valueOf(r[c])); return '$' + params.length; }).join(', ') + ')').join(', ');
    const r = await asCaller(caller, tx => tx.query<any>(`insert into public.${table} (${cols.map(ident).join(', ')}) values ${values}${returning}`, params));
    return send(201, returning ? r.rows : undefined);
  }
  const counted = (n: number | undefined): Record<string, string> => (prefer.includes('count=exact') ? { 'content-range': `*/${n ?? 0}` } : {});
  if (req.method === 'PATCH') {
    const sets = Object.entries(body ?? {}).map(([c, v]) => { params.push(valueOf(v)); return `${ident(c)} = $${params.length}`; });
    const r = await asCaller(caller, tx => tx.query<any>(`update public.${table} set ${sets.join(', ')}${where(url, params)}${returning}`, params));
    return send(returning ? 200 : 204, returning ? r.rows : undefined, counted(r.affectedRows));
  }
  if (req.method === 'DELETE') {
    const r = await asCaller(caller, tx => tx.query<any>(`delete from public.${table}${where(url, params)}${returning}`, params));
    return send(returning ? 200 : 204, returning ? r.rows : undefined, counted(r.affectedRows));
  }
  throw new RestError(405, 'PGRST000', 'method not allowed');
}

/* Postgres errors the way the data API reports them */
function pgError(e: any) {
  const code: string = e.code ?? 'XX000';
  const status = code === '42501' ? 403 : code === '23505' ? 409 : code === 'P0002' ? 404 : code.startsWith('22') || code.startsWith('23') || code === 'P0001' ? 400 : 500;
  return { status, body: { code, message: e.message, details: e.detail ?? null, hint: e.hint ?? null } };
}

/* ---------------------------------------------------------------- Storage */
/* Uploads, public reads and deletes, with the bucket's size and type limits. Each upload and delete is a row in
   storage.objects written as the caller, so the media bucket's rules decide; the bytes are kept in memory. */

const files = new Map<string, { type: string; data: Buffer }>();
class StorageError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

async function storage(req: IncomingMessage, res: ServerResponse, path: string, raw: Buffer, caller: Caller) {
  const pub = path.match(/^\/object\/public\/([^/]+)\/(.+)$/);
  if (pub && (req.method === 'GET' || req.method === 'HEAD')) {
    const bucket = (await sql(`select public from storage.buckets where id = $1`, [pub[1]])).rows[0];
    const f = bucket?.public && files.get(pub[1] + '/' + decodeURIComponent(pub[2]));
    if (!f) throw new StorageError(404, 'not_found', 'Object not found');
    res.writeHead(200, { 'content-type': f.type, 'content-length': String(f.data.length), 'cache-control': 'no-cache' });
    return res.end(req.method === 'HEAD' ? undefined : f.data);
  }
  const obj = path.match(/^\/object\/([^/]+)\/(.+)$/);
  if (obj && (req.method === 'POST' || req.method === 'PUT')) {
    const [bucketId, name] = [obj[1], decodeURIComponent(obj[2])];
    const ct = String(req.headers['content-type'] ?? 'application/octet-stream');
    let data = raw, type = ct;
    if (ct.startsWith('multipart/form-data')) {
      const form = await new Response(new Uint8Array(raw), { headers: { 'content-type': ct } }).formData();
      const file = [...form.values()].find(v => typeof v !== 'string') as File | undefined;
      if (!file) throw new StorageError(400, 'invalid_request', 'No file in the upload');
      data = Buffer.from(await file.arrayBuffer());
      type = file.type || 'application/octet-stream';
    }
    const bucket = (await sql(`select file_size_limit, allowed_mime_types from storage.buckets where id = $1`, [bucketId])).rows[0];
    if (!bucket) throw new StorageError(404, 'not_found', 'Bucket not found');
    if (bucket.file_size_limit && data.length > Number(bucket.file_size_limit)) throw new StorageError(413, 'Payload too large', 'The object exceeded the maximum allowed size');
    if (bucket.allowed_mime_types && !bucket.allowed_mime_types.includes(type)) throw new StorageError(415, 'invalid_mime_type', `mime type ${type} is not supported`);
    const key = bucketId + '/' + name;
    const exists = (await sql(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucketId, name])).rows.length > 0;
    if (exists && req.headers['x-upsert'] !== 'true') throw new StorageError(409, 'Duplicate', 'The resource already exists');
    try {
      const id = await asCaller(caller, async tx => exists
        ? (await tx.query<any>(`update storage.objects set owner = $3 where bucket_id = $1 and name = $2 returning id`, [bucketId, name, caller.claims.sub ?? null])).rows[0]?.id
        : (await tx.query<any>(`insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3) returning id`, [bucketId, name, caller.claims.sub ?? null])).rows[0]?.id);
      if (!id) throw new StorageError(403, 'Unauthorized', 'new row violates row-level security policy');
      files.set(key, { type, data });
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ Key: key, Id: id }));
    } catch (e: any) {
      if (e instanceof StorageError) throw e;
      if (e.code === '42501') throw new StorageError(403, 'Unauthorized', 'new row violates row-level security policy');
      throw e;
    }
  }
  const del = path.match(/^\/object\/([^/]+)$/);
  if (del && req.method === 'DELETE') {
    const prefixes: string[] = JSON.parse(raw.toString() || '{}').prefixes ?? [];
    const gone = await asCaller(caller, tx => tx.query<any>(`delete from storage.objects where bucket_id = $1 and name = any($2::text[]) returning name`, [del[1], prefixes]));
    for (const r of gone.rows) files.delete(del[1] + '/' + r.name);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(gone.rows.map(r => ({ name: r.name, bucket_id: del[1] }))));
  }
  throw new StorageError(404, 'not_found', 'Not found: ' + path);
}

/* ---------------------------------------------------------------- the server */

export async function startFake(port = 54321) {
  db = await createDb();
  for (const [who, s] of Object.entries(STAFF)) {
    await db.query(`update auth.users set email = $2, encrypted_password = $3, email_confirmed_at = now() where id = $1`, [U[who as keyof typeof U], s.email, hashPassword(s.password)]);
    await db.query(`update public.profiles set email = $2, full_name = $3 where id = $1`, [U[who as keyof typeof U], s.email, (s as any).name ?? '']);
  }
  FKS = (await db.query<any>(`
    select c.conrelid::regclass::text as table, a.attname as column, c.confrelid::regclass::text as ftable, fa.attname as fcolumn
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
    where c.contype = 'f' and cardinality(c.conkey) = 1 and c.connamespace = 'public'::regnamespace`)).rows
    .map(f => ({ ...f, table: f.table.replace(/^public\./, ''), ftable: f.ftable.replace(/^public\./, '') }));
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    const json = String(req.headers['content-type'] ?? '').includes('json') || /^\s*[[{]/.test(raw.subarray(0, 1).toString());
    const body = raw.length && json && !url.pathname.startsWith('/storage/') ? JSON.parse(raw.toString()) : {};
    const apikey = (req.headers.apikey as string) ?? null;
    const bearer = String(req.headers.authorization ?? '').replace(/^Bearer /i, '') || null;
    try {
      if (url.pathname.startsWith('/storage/v1')) {
        const claims = bearer && bearer !== KEYS.secret && bearer !== KEYS.publishable ? verify(bearer) : null;
        const caller: Caller = apikey === KEYS.secret || bearer === KEYS.secret ? { role: 'service_role', claims: { role: 'service_role' } }
          : claims ? { role: 'authenticated', claims } : { role: 'anon', claims: { role: 'anon' } };
        return await storage(req, res, url.pathname.slice(11), raw, caller);
      }
      if (url.pathname === '/__outbox') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(outbox)); }
      if (url.pathname.startsWith('/auth/v1')) {
        const out = await auth(req, url.pathname.slice(8), url, body, bearer, apikey);
        if (out === null) { res.writeHead(204); return res.end(); }
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(out));
      }
      if (url.pathname.startsWith('/rest/v1')) {
        if (apikey !== KEYS.publishable && apikey !== KEYS.secret) throw new RestError(401, 'PGRST301', 'No API key found in request');
        const claims = bearer && bearer !== KEYS.secret && bearer !== KEYS.publishable ? verify(bearer) : null;
        if (bearer && bearer !== KEYS.secret && bearer !== KEYS.publishable && !claims) throw new RestError(401, 'PGRST303', 'JWT expired');
        const caller: Caller = apikey === KEYS.secret || bearer === KEYS.secret ? { role: 'service_role', claims: { role: 'service_role' } }
          : claims ? { role: 'authenticated', claims } : { role: 'anon', claims: { role: 'anon' } };
        return await rest(req, res, url.pathname.slice(8), url, body, caller);
      }
      res.writeHead(404); res.end();
    } catch (e: any) {
      if (e instanceof AuthError) {
        res.writeHead(e.status, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ code: e.code, error_code: e.code, msg: e.message, message: e.message }));
      }
      if (e instanceof StorageError) {
        res.writeHead(e.status, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ statusCode: String(e.status), error: e.code, message: e.message }));
      }
      const { status, body: b } = e instanceof RestError ? { status: e.status, body: { code: e.code, message: e.message, details: null, hint: null } } : pgError(e);
      if (status === 500) console.error(e);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(b));
    }
  });
  await new Promise<void>(r => server.listen(port, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${port}`, db };
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('fake-supabase.ts')) {
  const { url } = await startFake(Number(process.argv[2]) || 54321);
  console.log('fake Supabase on ' + url);
}
