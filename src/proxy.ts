import { createServerClient } from '@supabase/ssr';
import createIntlProxy from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createIntlProxy(routing);

/* Runs before every page.
   - /admin: keeps the staff login fresh, and sends anyone not logged in to the login page.
     (This is only the front door: every page and action checks the role again on the server, and the
     database rules check it a third time.)
   - everything else: picks the language from the address (/fr/…, /ar/…, or English). */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  const open = request.nextUrl.pathname.startsWith('/admin/login') || request.nextUrl.pathname.startsWith('/admin/auth');
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
  /* not for files (anything with a dot), Next.js internals, or the server's own endpoints */
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
