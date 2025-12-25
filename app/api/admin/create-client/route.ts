// app/api/admin/create-client/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ADMIN_EMAILS, SITE_URL } from '@/lib/site';

export const runtime = 'nodejs'; // @supabase/ssr requires Node APIs

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const needle = email.toLowerCase();
  return ADMIN_EMAILS.some(e => e.toLowerCase() === needle);
}

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) {
    return NextResponse.json(
      { ok: false, error: 'missing_supabase_env' },
      { status: 500 }
    );
  }

  const res = new NextResponse();

  // Use @supabase/ssr to read the current session from cookies safely
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ ok: false, error: 'not_authorized' }, { status: 403 });
    }

    const { email, full_name, password } = (await req.json()) as {
      email: string;
      full_name?: string;
      password?: string; // optional
    };

    if (!email) {
      return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 });
    }

    // Service-role client bypasses RLS for admin operations
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Create (or ensure) the Auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,                         // if omitted, they’ll use magic link to set a password later
      email_confirm: false,             // invite email will handle verification
      user_metadata: { full_name: full_name ?? null, role: 'client' },
      app_metadata: { role: 'client' },
    });
    if (createErr) throw createErr;

    // 2) Send an invite with redirect back to the client profile
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE_URL}/profile`,
    });

    // 3) Upsert profile row keyed by auth.users.id
    const userId = created.user.id;
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: full_name ?? null,
          role: 'client',
        },
        { onConflict: 'id' }
      );
    if (profileErr) throw profileErr;

    return NextResponse.json({ ok: true, userId }, { status: 200, headers: res.headers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown_error' }, { status: 400, headers: res.headers });
  }
}

