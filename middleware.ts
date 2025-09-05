// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;

  const url = req.nextUrl;
  const path = url.pathname;

  const isAuth = path.startsWith('/login') || path.startsWith('/auth/');
  const isPublicAsset =
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/icons') ||
    path.startsWith('/images') ||
    path.startsWith('/robots.txt') ||
    path.startsWith('/sitemap.xml');

  if (!user && !isAuth && !isPublicAsset) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = user.email ? adminList.includes(user.email.toLowerCase()) : false;

    if (!isAdmin) {
      // only allow profile, auth, and public assets
      const allowedPrefixes = ['/profile', '/auth', '/_next', '/favicon', '/images', '/icons'];
      const allowed = allowedPrefixes.some((p) => path.startsWith(p)) || path === '/';
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

