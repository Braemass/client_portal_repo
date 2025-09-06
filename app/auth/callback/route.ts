// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function makeServerClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}

// Handles OAuth & email-link callbacks: .../auth/callback?code=...&next=/profile
export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = makeServerClient(req, res);

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/profile';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
    }
  }
  // now authenticated on the server — go where requested
  return NextResponse.redirect(new URL(next, req.url), { headers: res.headers });
}

// Used after signInWithPassword so the server can store refreshed cookies
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabase = makeServerClient(req, res);
  await supabase.auth.getSession(); // touches and sets cookies into `res`
  return res;
}

