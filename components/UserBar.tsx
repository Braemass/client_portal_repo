'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function UserBar({
  initialEmail = null,
  initialAvatarUrl = null,
}: {
  initialEmail?: string | null;
  initialAvatarUrl?: string | null;
}) {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);

  useEffect(() => {
    let mounted = true;

    // Initial client-side session (keeps hydrated UI accurate if server had none)
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setEmail((prev) => data.session?.user?.email ?? prev);
      setAvatarUrl((prev) => data.session?.user?.user_metadata?.avatar_url ?? prev);
    })();

    // Update on auth changes + sync cookies on sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT') {
          setEmail(null);
          setAvatarUrl(null);
          await fetch('/auth/callback', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ event: 'SIGNED_OUT' }),
          });
          if (typeof window !== 'undefined') window.location.href = '/login';
          return;
        }
        setEmail(session?.user?.email ?? null);
        setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // onAuthStateChange will handle cookie sync + redirect
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        title="Your profile"
      >
        Profile
      </Link>

      {email ? (
        <>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-7 w-7 rounded-full border border-black/10 object-cover"
            />
          ) : (
            <span className="hidden rounded-full bg-black/10 px-2 py-1 text-xs sm:inline">
              {email}
            </span>
          )}
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

