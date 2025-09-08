// components/UserBarServer.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ADMIN_EMAILS } from '@/lib/site';

export default async function UserBarServer() {
  // Next 15 (Node runtime): cookies() is async
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No-ops because Server Components cannot mutate cookies
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? null;
  const isAdmin =
    !!email &&
    ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <>
          <Link
            href={isAdmin ? '/admin' : '/profile'}
            className="text-sm font-medium hover:underline"
          >
            {email}
          </Link>
          {/* Uses your GET /auth/signout route */}
          <form action="/auth/signout" method="get">
            <button className="rounded-md px-3 py-1.5 text-sm border hover:bg-neutral-50">
              Log out
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 text-sm border hover:bg-neutral-50"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

