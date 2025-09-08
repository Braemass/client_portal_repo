// app/admin/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { isAdminEmail, ROUTES } from '@/lib/site';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Read-only cookie access is enough to check the session
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (_n: string, _v: string, _o: CookieOptions) => {},
      remove: (_n: string, _o: CookieOptions) => {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? '';

  if (!email) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.admin)}`);
  }
  if (!isAdminEmail(email)) {
    redirect(ROUTES.profile);
  }

  return <>{children}</>;
}

