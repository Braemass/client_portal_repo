// app/admin/layout.tsx
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { children: ReactNode };

/**
 * Admin layout
 * - Requires authentication
 * - Admin emails are taken from NEXT_PUBLIC_ADMIN_EMAILS (comma-separated)
 * - Non-admins -> /profile, unauthenticated -> /login?next=/admin
 */
export default async function AdminLayout({ children }: Props) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // NEXT 15: cookies() is async
  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // no-ops are fine in a server component (read-only usage)
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (user.email || '').toLowerCase();
  const isAdmin = adminEmails.includes(email);

  if (!isAdmin) {
    redirect('/profile');
  }

  return <section>{children}</section>;
}

