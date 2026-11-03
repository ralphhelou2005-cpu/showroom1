/* npm run preview: serves the built site (dist/) the way GitHub Pages does, at http://localhost:4173/showroom1/
   /inventory finds inventory.html, a folder finds its index.html, and any other address gets 404.html. */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const PORT = Number(process.env.PORT) || 4173, BASE = process.env.BASE || '/showroom1/', DIST = process.env.DIST || 'dist';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json', '.svg': 'image/svg+xml' };
const isFile = p => existsSync(p) && statSync(p).isFile();

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (BASE !== '/' && (url.pathname === '/' || url.pathname === BASE.slice(0, -1))) { res.writeHead(301, { Location: BASE }); return res.end(); }
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); return res.end('Not found'); }
  const rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length))).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, rel), status = 200;
  if (url.pathname.endsWith('/')) file = join(file, 'index.html');
  else if (!isFile(file) && isFile(file + '.html')) file += '.html';
  else if (!isFile(file) && isFile(join(file, 'index.html'))) { res.writeHead(301, { Location: url.pathname + '/' + url.search }); return res.end(); }
  if (!isFile(file)) { file = join(DIST, '404.html'); status = 404; }
  if (!isFile(file)) { res.writeHead(404); return res.end('Not found'); }
  const body = readFileSync(file), type = TYPES[extname(file)] || 'application/octet-stream';
  /* videos are read in pieces by the walk-in, like on GitHub Pages */
  const range = req.headers.range && /bytes=(\d+)-(\d*)/.exec(req.headers.range);
  if (range && status === 200) {
    const a = +range[1], b = range[2] ? +range[2] : body.length - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${body.length}`, 'Content-Length': b - a + 1, 'Accept-Ranges': 'bytes' });
    return res.end(body.subarray(a, b + 1));
  }
  /* text files go compressed, as GitHub Pages sends them */
  if (/text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    const z = gzipSync(body);
    res.writeHead(status, { 'Content-Type': type, 'Content-Encoding': 'gzip', 'Content-Length': z.length, 'Vary': 'Accept-Encoding', 'Cache-Control': 'max-age=600' });
    return res.end(z);
  }
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': body.length, 'Accept-Ranges': 'bytes', 'Cache-Control': 'max-age=600' });
  res.end(body);
}).listen(PORT, () => console.log(`Milcar is running at http://localhost:${PORT}${BASE}`));
