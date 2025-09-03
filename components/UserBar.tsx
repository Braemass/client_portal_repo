'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';

export default function UserBar() {
  // Your hook (may or may not include supabase depending on your local file)
  const ctx = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();

  // Fallback: if ctx.supabase is undefined, create a browser client here
  const supa = useMemo(() => {
    if ((ctx as any)?.supabase) return (ctx as any).supabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createBrowserClient(url, key);
  }, [ctx]);

  const session = (ctx as any)?.session ?? null;
  const user = (ctx as any)?.user ?? null;

  async function logout() {
    // Protect against missing envs in dev
    if (!supa) return;
    await supa.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className="userbar flex items-center justify-end gap-3">
      {session ? (
        <>
          <span className="text-sm">{user?.email ?? 'Signed in'}</span>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Log out
          </button>
        </>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(pathname || '/')}`}
          className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Log in
        </Link>
      )}
    </nav>
  );
}
