// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Public assets and files we always allow to pass through
const PUBLIC_ASSET_PREFIXES = [
  '/_next', '/favicon', '/icons', '/images', '/assets', '/fonts', '/public',
];
const PUBLIC_FILES = new Set(['/robots.txt', '/sitemap.xml']);

// Treat these as public (no session required)
function isAuthRoute(path: string) {
  return (
    path === '/login' ||
    path.startsWith('/auth/') ||          // OAuth callback, etc.
    path === '/reset-password' ||
    path.startsWith('/api/auth/')         // forgot-password API, etc.
  );
}

function isPublicAsset(path: string) {
  if (PUBLIC_FILES.has(path)) return true;
  return PUBLIC_ASSET_PREFIXES.some((p) => path.startsWith(p)) || /\.[a-zA-Z0-9]+$/.test(path);
}

export async function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // Always allow assets and explicitly-public auth routes
  if (isPublicAsset(pathname) || isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // We’ll write cookies to this response. If we later redirect,
  // we’ll copy these cookies to the redirect response.
  let response = NextResponse.next();

  // Supabase server client using request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    }
  );

  // Current session (if any)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Unauthenticated → send to /login?next=<requested path+query>
  if (!session) {
    const url = new URL('/login', origin);
    url.searchParams.set('next', `${pathname}${search || ''}` || '/profile');
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // If already signed in and hits /login, send to /profile
  if (pathname === '/login') {
    const url = new URL('/profile', origin);
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // Admin-gate: block /admin/* for non-admins
  if (pathname.startsWith('/admin')) {
    let isAdmin = false;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role,is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        if ((profile as any).role === 'admin') isAdmin = true;
        if ((profile as any).is_admin === true) isAdmin = true;
      }
    } catch {
      // If the check fails, assume not admin
      isAdmin = false;
    }

    if (!isAdmin) {
      const url = new URL('/profile', origin);
      const redirectRes = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }
  }

  // Optional: send authenticated users who hit "/" to /profile by default
  if (pathname === '/') {
    const url = new URL('/profile', origin);
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // Default: continue
  return response;
}

// ✅ No capturing groups in this matcher
export const config = {
  matcher: [
    // Run middleware for everything except Next internals and common public folders/files
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|icons/|assets/|fonts/).*)',
  ],
};

