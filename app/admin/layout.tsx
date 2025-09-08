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
 * - Requires the signed-in user's email to be in NEXT_PUBLIC_ADMIN_EMAILS (comma-separated)
 * - Redirects non-admins to /profile and unauthenticated users to /login?next=/admin
 */
export default async function AdminLayout({ children }: Props) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        // In RSC, cookies() is synchronous
        return cookieStore.get(name)?.value;
      },
      // No-ops are fine in a server component layout (we just need read access)
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → send to login
  if (!user) {
    redirect('/login?next=/admin');
  }

  // Admin check from env var list
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (user.email || '').toLowerCase();
  const isAdmin = adminEmails.includes(email);

  // Signed in but not an admin → go to profile
  if (!isAdmin) {
    redirect('/profile');
  }

  // Admin → render the admin UI
  return <section>{children}</section>;
}

