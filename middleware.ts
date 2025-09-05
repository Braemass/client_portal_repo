// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // Response we can mutate cookies on
  const res = NextResponse.next();

  // Supabase client for Edge middleware wired to request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          // Set cookie on the response so it persists after middleware
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl;
  const path = url.pathname;

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth/');
  const isPublicAsset =
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/icons') ||
    path.startsWith('/images') ||
    path === '/robots.txt' ||
    path === '/sitemap.xml';

  // Redirect unauthenticated users to /login (preserve intended path)
  if (!user && !isAuthRoute && !isPublicAsset) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  // Restrict non-admins to /profile (plus assets/auth)
  if (user) {
    const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = user.email ? adminList.includes(user.email.toLowerCase()) : false;

    if (!isAdmin) {
      const allowed =
        path === '/' ||
        path.startsWith('/profile') ||
        isAuthRoute ||
        isPublicAsset;

      if (!allowed) {
        const profileUrl = new URL('/profile', req.url);
        return NextResponse.redirect(profileUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|icons/).*)',
  ],
};

