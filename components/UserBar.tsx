'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function UserBar() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT') {
          setEmail(null);
          await fetch('/auth/callback', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ event: 'SIGNED_OUT' }),
          });
          if (typeof window !== 'undefined') window.location.href = '/login';
          return;
        }
        setEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // onAuthStateChange will sync cookies + redirect
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg:white/10"
        title="Your profile"
      >
        Profile
      </Link>

      {email ? (
        <>
          <span className="hidden text-sm text-gray-600 sm:inline">{email}</span>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-brand-teal px-3 py-1.5 text-sm text-white hover:opacity-90"
          title="Sign in"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

