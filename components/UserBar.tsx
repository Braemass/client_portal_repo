'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession'; // fixed import alias

export default function UserBar() {
  const { supabase, session, user } = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className="userbar flex items-center gap-4">
      {session ? (
        <>
          <span className="text-sm text-gray-700">{user?.email}</span>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Log out
          </button>
        </>
      ) : (
        <Link
          href={`/login?next=${pathname}`}
          className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Log in
        </Link>
      )}
    </nav>
  );
}

