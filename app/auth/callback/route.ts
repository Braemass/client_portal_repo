// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          cookieStore.set({ name, value, ...options });
        },
        remove: (name, options) => {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = searchParams.get('next') || '/profile';
  const supabase = createClient();

  await supabase.auth.exchangeCodeForSession();
  return NextResponse.redirect(new URL(next, req.url));
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { event, session } = await req.json();

  if (event === 'SIGNED_OUT') {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }

  if (session?.access_token && session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }

  return NextResponse.json({ ok: true });
}

