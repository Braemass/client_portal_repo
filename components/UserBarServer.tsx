// components/UserBarServer.tsx
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function UserBarServer() {
  const cookieStore = cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <>
          <Link href="/profile" className="text-slate-200 hover:text-sky-400">
            {email}
          </Link>
          <form action="/auth/signout" method="post">
            <button
              className="rounded-md px-3 py-1.5 text-sm bg-white/10 border border-white/15 text-slate-100 hover:bg-white/20"
              type="submit"
            >
              Log out
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 text-sm bg-sky-500 text-slate-900 font-semibold hover:bg-sky-400"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

