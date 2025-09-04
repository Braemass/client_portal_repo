'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function UserBar() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setEmail(data.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      // both shapes across SDK versions
      // @ts-ignore
      sub?.subscription?.unsubscribe?.();
      // @ts-ignore
      sub?.unsubscribe?.();
    };
  }, []);

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push('/login');
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {email ? (
        <>
          <span className="hidden sm:inline text-gray-700">{email}</span>
          <button
            onClick={logout}
            className="rounded-md border px-2 py-1 hover:bg-gray-50"
            title="Sign out"
          >
            Logout
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5"
        >
          Login
        </Link>
      )}
    </div>
  );
}

