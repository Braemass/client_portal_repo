// app/auth/callback/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function makeClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookies from the incoming request
        getAll() {
          return req.cookies.getAll();
        },
        // Write cookies onto the response (Supabase will call this)
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/profile';

  // Prepare redirect response first so cookie writes land on it
  const res = NextResponse.redirect(new URL(next, req.url));
  const supabase = makeClient(req, res);

  // Finish the OAuth flow (Google, etc.)
  const code = url.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
 if (!code) {
    // No code? Bounce to login with an error.
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url));
  }

  return res;
}

const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  );

  // Exchange the code for a session (IMPORTANT: string param, not object)
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // You are now authenticated server-side — send them where they need to go
  return NextResponse.redirect(new URL(next, req.url));
}

// Optional: lets the client sync server cookies after email+password sign-in/sign-out
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabase = makeClient(req, res);

  try {
    const { event, session } = await req.json();

    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut();
    } else if (session?.access_token && session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  } catch {
    // no-op
  }

  return res;
}

