// app/api/auth/forgot/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({} as any));
  // Always respond generically to avoid email enumeration
  const generic = NextResponse.json({ ok: true });

  if (!email || typeof email !== 'string') return generic;

  const res = NextResponse.json({ ok: true });

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
            res.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    }
  );

  // Case-insensitive match against clients.email
  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', email.trim()) // case-insensitive
    .maybeSingle();

  // If they’re not in `clients`, silently return generic success
  if (clientErr || !clientRow) return res;

  // Send reset (requires SMTP/Resend configured + existing Auth user)
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${req.nextUrl.origin}/reset-password`,
  });

  return res;
}

