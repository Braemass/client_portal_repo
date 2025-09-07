// app/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Support both POST (preferred) and GET
export async function POST(req: NextRequest) {
  // Single response: we will both clear cookies and set Location on this one
  const res = new NextResponse(null, { status: 302 });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options?: any) => {
        res.cookies.set({ name, value, ...(options || {}) });
      },
      remove: (name: string, options?: any) => {
        res.cookies.set({ name, value: '', ...(options || {}), maxAge: 0 });
      },
    },
  });

  // Sign out and clear auth cookies on our response
  await supabase.auth.signOut();

  // Send user back to login
  res.headers.set('Location', new URL('/login', SITE_URL).toString());
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

