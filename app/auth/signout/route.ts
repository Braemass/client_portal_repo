// app/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST() {
  const cookieStore = await cookies();
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) =>
        res.cookies.set({ name, value, ...options }),
      remove: (name: string, options: CookieOptions) =>
        res.cookies.set({ name, value: '', ...options, maxAge: 0 }),
    },
  });

  await supabase.auth.signOut();
  return res;
}

