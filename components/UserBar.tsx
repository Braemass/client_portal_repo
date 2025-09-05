'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export default function UserBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Initial session (typed + awaited)
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
    })();

    // Typed auth listener + cleanup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        setEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <>
          <span className="text-sm text-black/70 dark:text-white/70">{email}</span>
          <form
            action={async () => {
              await supabase.auth.signOut();
              setEmail(null);
            }}
          >
            <button
              type="submit"
              className="rounded-md border px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-brand-teal px-3 py-1 text-sm text-white hover:opacity-90"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

