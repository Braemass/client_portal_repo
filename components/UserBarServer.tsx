// components/UserBarServer.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAdminEmail } from '@/lib/site';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// NOTE: This is a Server Component (do NOT add "use client")
export default async function UserBarServer() {
  // ✅ FIX: await cookies() because in your setup it returns a Promise
  const cookieStore = await cookies();

  // Read-only cookie adapter for Supabase in RSCs
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // no-ops to satisfy types; RSCs shouldn't set cookies
      set: () => {},
      remove: () => {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold bg-sky-500 text-slate-900 hover:bg-sky-400 transition"
      >
        Sign in
      </Link>
    );
  }

  const email = user.email ?? '';
  const admin = isAdminEmail(email);

  return (
    <div className="flex items-center gap-3">
      <Link
        href={admin ? '/admin' : '/profile'}
        className="text-sm text-slate-200 hover:text-white underline-offset-4 hover:underline"
      >
        {admin ? 'Admin Panel' : 'My Profile'}
      </Link>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold bg-slate-700 text-slate-100 hover:bg-slate-600 transition"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

