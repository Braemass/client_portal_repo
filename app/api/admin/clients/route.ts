// app/api/admin/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'braemass22@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !ANON || !SERVICE) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const { email, fullName } = (await req.json().catch(() => ({}))) as {
    email?: string;
    fullName?: string;
  };

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  // 1) Verify the caller is a signed-in admin (via SSR client + cookies)
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_n: string, _v: string, _o: CookieOptions) {},
      remove(_n: string, _o: CookieOptions) {},
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  const me = userData?.user;
  if (!me || !isAdminEmail(me.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) Use the SERVICE-ROLE client to bypass RLS for user + profile creation
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try to create the auth user; if it already exists, fall back to generateLink() to get the id
  let authUserId: string | undefined;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: fullName || null, role: 'client' },
    app_metadata: { role: 'client' },
  });

  if (created?.user?.id) {
    authUserId = created.user.id;
  } else {
    // If the user already exists, generateLink returns the user object (gives us the id)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${SITE_URL}/login` },
    });
    if (linkErr) {
      return NextResponse.json(
        { error: createErr?.message || linkErr.message || 'Failed to create/find user' },
        { status: 400 }
      );
    }
    authUserId = linkData?.user?.id;
  }

  if (!authUserId) {
    return NextResponse.json({ error: 'Could not resolve user id' }, { status: 400 });
  }

  // 3) Upsert their profile row with SERVICE role (bypasses RLS)
  const { error: upsertErr } = await admin.from('profiles').upsert(
    {
      id: authUserId,
      email,
      full_name: fullName || null,
      role: 'client',
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 400 });
  }

  // 4) Send an invite email (optional, helpful for first-time login)
  await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/login`,
  });

  return NextResponse.json({ ok: true, userId: authUserId });
}

