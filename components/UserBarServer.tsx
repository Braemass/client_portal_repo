// components/UserBarServer.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAdminEmail } from '@/lib/site';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function UserBarServer() {
  noStore();

  const cookieStore = cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-sky-400"
      >
        Sign in
      </Link>
    );
  }

  const admin = isAdminEmail(email);

  return (
    <div className="flex items-center gap-3">
      {admin && (
        <Link
          href="/admin"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Admin
        </Link>
      )}
      <span className="hidden text-sm text-slate-700 md:inline">{email}</span>
      <form action="/auth/signout" method="post">
        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
          Sign out
        </button>
      </form>
    </div>
  );
}

