// app/login/page.tsx
'use client';

import { createClient } from '@supabase/supabase-js';
import { SITE_URL, ROUTES } from '@/lib/site';
import { useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [loading, setLoading] = useState<'user' | 'admin' | null>(null);

  async function signInUser() {
    setLoading('user');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // normal users go to profile
        redirectTo: `${SITE_URL}${ROUTES.callback}?next=${encodeURIComponent(ROUTES.profile)}`,
      },
    });
    if (error) {
      setLoading(null);
      alert(error.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  }

  async function signInAdmin() {
    setLoading('admin');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // request admin; the callback will enforce admin email
        redirectTo: `${SITE_URL}${ROUTES.callback}?next=${encodeURIComponent(ROUTES.admin)}`,
      },
    });
    if (error) {
      setLoading(null);
      alert(error.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  }

  return (
    <div className="min-h-screen bg-[#0b2239] flex items-center">
      <div className="mx-auto w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
        <div className="rounded-2xl p-8 bg-white/5 border border-white/10 text-white">
          <p className="uppercase tracking-[.2em] text-xs text-cyan-300/80">Client Portal • StrandAerial</p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome to StrandAerial</h1>
          <ul className="mt-6 space-y-2 text-sm text-white/80 list-disc list-inside">
            <li>Encrypted sessions with Supabase</li>
            <li>Client-specific project access</li>
            <li>Update your profile anytime</li>
          </ul>
        </div>

        <div className="rounded-2xl p-8 bg-white shadow">
          <h2 className="text-lg font-semibold mb-6">Sign in</h2>
          <div className="grid gap-3">
            <button
              onClick={signInUser}
              disabled={!!loading}
              className="h-11 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition"
            >
              {loading === 'user' ? 'Redirecting…' : 'Sign in with Google'}
            </button>

            <div className="h-px bg-gray-200 my-1" />

            <button
              onClick={signInAdmin}
              disabled={!!loading}
              className="h-11 rounded-lg bg-gray-900 text-white font-medium hover:bg-black transition"
              title="Admins only"
            >
              {loading === 'admin' ? 'Checking admin…' : 'Admin sign in'}
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Admin sign-in will open the admin panel if your email is authorized.
          </p>
        </div>
      </div>
    </div>
  );
}

