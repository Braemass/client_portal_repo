// app/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  // Next 15: cookies() is async in the Node runtime
  const cookieStore = await cookies();

  // We’ll mutate this response with cleared cookies, then return it
  const res = NextResponse.redirect(new URL('/login', req.url));

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        res.cookies.set({ name, value, ...(options || {}) });
      },
      remove(name: string, options?: any) {
        res.cookies.set({ name, value: '', ...(options || {}), maxAge: 0 });
      },
    },
  });

  await supabase.auth.signOut();

  return res;
}

