// components/UserBarServer.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAdminEmail } from '@/lib/site';

export default async function UserBarServer() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold bg-sky-500 text-slate-900 hover:bg-sky-400"
      >
        Sign in
      </Link>
    );
  }

  const admin = isAdminEmail(user.email);

  return (
    <div className="flex items-center gap-3">
      {admin && (
        <Link
          href="/admin"
          className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold bg-amber-300 text-slate-900 hover:bg-amber-200"
        >
          Admin
        </Link>
      )}
      <Link
        href="/profile"
        className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold bg-sky-500 text-slate-900 hover:bg-sky-400"
      >
        {user.email}
      </Link>
    </div>
  );
}

