import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { SUPABASE_URL } from './src/config.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/* the admin page may only run and load what it needs: this site and the Supabase project.
   Added to the built page only, because the dev server injects its own scripts and styles. */
const adminLock = (): Plugin => ({
  name: 'milcar-admin-lock',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (!ctx.filename.endsWith('admin.html')) return html;
      const csp = `default-src 'self'; script-src 'self'; connect-src 'self' ${SUPABASE_URL}; img-src 'self' data: blob: ${SUPABASE_URL}; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`;
      return html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
    }
  }
});

export default defineConfig({
  /* GitHub Pages serves the site from ralphhelou2005-cpu.github.io/showroom1/.
     Moving to a site of its own (Netlify, a domain): change this to '/' and SITE_ORIGIN in src/config.ts. */
  base: '/showroom1/',
  plugins: [react(), adminLock()],
  build: {
    /* pictures stay real files (never folded into the code), so the browser can cache and size them */
    assetsInlineLimit: 0,
    rollupOptions: { input: { main: here('index.html'), admin: here('admin.html') } }
  }
});
