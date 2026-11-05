import { createServerClient } from '@supabase/ssr';
import createIntlProxy from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createIntlProxy(routing);

/* the current site's addresses keep working: car.html?id=f8-tributo becomes /car/f8-tributo, and so on.
   (The address in the browser keeps its #part, like #book, by itself.) */
function oldAddress(request: NextRequest): NextResponse | null {
  const { pathname, searchParams, search } = request.nextUrl;
  const to = (path: string, keepQuery = false) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = keepQuery ? search : '';
    return NextResponse.redirect(url, 308);
  };
  if (pathname === '/index.html') return to('/', true);
  if (pathname === '/inventory.html') return to('/inventory', true);
  if (pathname === '/featured.html') return to('/featured', true);
  if (pathname === '/car.html' || pathname === '/car' || pathname === '/car/') {
    const id = searchParams.get('id');
    return to(id && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) ? '/car/' + id : '/inventory');
  }
  return null;
}

/* Runs before every page.
   - old addresses: sent on to their new ones.
   - /admin: keeps the staff login fresh, and sends anyone not logged in to the login page.
     (This is only the front door: every page and action checks the role again on the server, and the
     database rules check it a third time.)
   - everything else: picks the language from the address (/fr/…, /ar/…, or English). */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const moved = oldAddress(request);
  if (moved) return moved;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return admin(request);
  return intl(request);
}

async function admin(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  /* the doors themselves: signing in, a forgotten password, and the page a one-time link opens */
  const open = ['/admin/login', '/admin/forgot', '/admin/auth/'].some(p => request.nextUrl.pathname.startsWith(p));
  if (!data?.claims && !open) {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    login.search = '';
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  /* not for files (anything with a dot, except the old .html addresses), Next.js internals, or the server's own endpoints */
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/(index|inventory|featured|car)\\.html'],
};
