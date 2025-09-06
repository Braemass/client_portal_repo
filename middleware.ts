// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/site';

function decodeJwtPayload<T = any>(jwt: string): T | null {
  try {
    const [, payloadB64] = jwt.split('.');
    if (!payloadB64) return null;
    // base64url → base64
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Read Supabase SSR auth cookie placed by @supabase/ssr callback.
 * Cookie name looks like: sb:<project-ref>-auth-token
 */
function readSupabaseEmailFromCookie(req: NextRequest) {
  const cookie = req.cookies
    .getAll()
    .find((c) => c.name.startsWith('sb:') && c.name.endsWith('-auth-token'));

  if (!cookie?.value) return { email: null as string | null, isExpired: true };

  try {
    const parsed = JSON.parse(cookie.value) as { access_token?: string };
    const token = parsed.access_token;
    if (!token) return { email: null as string | null, isExpired: true };

    const payload = decodeJwtPayload<{ email?: string; exp?: number }>(token);
    const email = payload?.email ?? null;
    const exp = payload?.exp ?? 0;
    const isExpired = exp ? Date.now() / 1000 >= exp : true;

    return { email, isExpired };
  } catch {
    return { email: null as string | null, isExpired: true };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Public routes that never require auth
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico';

  // Extract email (if any) from Supabase cookie
  const { email, isExpired } = readSupabaseEmailFromCookie(req);
  const isAuthed = !!email && !isExpired;
  const userIsAdmin = isAdmin(email);

  // If user hits "/" — send them to the right home
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = isAuthed ? (userIsAdmin ? '/admin' : '/profile') : '/login';
    // preserve ?next= if any
    return NextResponse.redirect(url);
  }

  // If already signed in, keep them out of /login
  if (pathname.startsWith('/login') && isAuthed) {
    const url = req.nextUrl.clone();
    const next = searchParams.get('next');
    url.pathname = next && next.startsWith('/')
      ? next
      : userIsAdmin
        ? '/admin'
        : '/profile';
    return NextResponse.redirect(url);
  }

  // Lock down /admin/**
  if (pathname.startsWith('/admin')) {
    if (!isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (!userIsAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/profile';
      return NextResponse.redirect(url);
    }
  }

  // For any **non-public** route, require auth
  if (!isPublic && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Allow request through
  return NextResponse.next();
}

// Keep matcher simple (no capturing groups)
export const config = {
  matcher: [
    // run on everything except Next internals and favicon
    '/((?!_next/|favicon.ico).*)',
  ],
};

